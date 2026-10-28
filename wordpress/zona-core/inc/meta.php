<?php
/**
 * Metadatos editoriales: formato del artículo y fuentes. Expuestos en la API REST para la automatización.
 */

defined( 'ABSPATH' ) || exit;

function zona_formats() {
	return array(
		'noticia'     => 'Noticia',
		'guia'        => 'Guía',
		'analisis'    => 'Análisis',
		'comparativa' => 'Comparativa',
		'explicacion' => 'Explicación',
		'seleccion'   => 'Selección',
		'especial'    => 'Especial',
	);
}

add_action( 'init', function () {
	$auth = function () {
		return current_user_can( 'edit_posts' );
	};
	register_post_meta( 'post', 'zona_formato', array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'default'           => 'guia',
		'sanitize_callback' => function ( $v ) {
			return array_key_exists( $v, zona_formats() ) ? $v : 'guia';
		},
		'auth_callback'     => $auth,
	) );
	// Fuentes como JSON: [{"title":"…","url":"https://…","publisher":"…","accessed":"AAAA-MM-DD"}]
	register_post_meta( 'post', 'zona_fuentes', array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'default'           => '[]',
		'sanitize_callback' => 'zona_sanitize_sources_json',
		'auth_callback'     => $auth,
	) );
} );

function zona_sanitize_sources_json( $value ) {
	$items = json_decode( (string) $value, true );
	if ( ! is_array( $items ) ) {
		return '[]';
	}
	$clean = array();
	foreach ( $items as $s ) {
		$url = esc_url_raw( $s['url'] ?? '', array( 'http', 'https' ) );
		if ( ! $url || empty( $s['title'] ) ) {
			continue;
		}
		$clean[] = array_filter( array(
			'title'     => sanitize_text_field( $s['title'] ),
			'url'       => $url,
			'publisher' => sanitize_text_field( $s['publisher'] ?? '' ),
			'accessed'  => preg_match( '/^\d{4}-\d{2}-\d{2}$/', $s['accessed'] ?? '' ) ? $s['accessed'] : '',
		) );
	}
	return wp_json_encode( $clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
}

function zona_get_sources( $post_id ) {
	$items = json_decode( (string) get_post_meta( $post_id, 'zona_fuentes', true ), true );
	return is_array( $items ) ? $items : array();
}

function zona_get_format( $post_id ) {
	$f = get_post_meta( $post_id, 'zona_formato', true );
	return array_key_exists( $f, zona_formats() ) ? $f : 'guia';
}

// Caja en el editor: formato y fuentes en texto plano (una por línea: Título | URL | Medio | AAAA-MM-DD).
add_action( 'add_meta_boxes_post', function () {
	add_meta_box( 'zona_editorial', 'Formato y fuentes', 'zona_render_meta_box', 'post', 'side', 'high' );
} );

function zona_render_meta_box( $post ) {
	wp_nonce_field( 'zona_meta', 'zona_meta_nonce' );
	$format = zona_get_format( $post->ID );
	echo '<p><label for="zona_formato"><strong>Formato</strong></label><br><select id="zona_formato" name="zona_formato" style="width:100%">';
	foreach ( zona_formats() as $key => $label ) {
		printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $format, $key, false ), esc_html( $label ) );
	}
	echo '</select></p>';
	$lines = array_map( function ( $s ) {
		return implode( ' | ', array_filter( array( $s['title'], $s['url'], $s['publisher'] ?? '', $s['accessed'] ?? '' ) ) );
	}, zona_get_sources( $post->ID ) );
	echo '<p><label for="zona_fuentes_txt"><strong>Fuentes</strong></label><br>';
	echo '<textarea id="zona_fuentes_txt" name="zona_fuentes_txt" rows="6" style="width:100%" placeholder="Título | https://… | Medio | 2026-10-28">' . esc_textarea( implode( "\n", $lines ) ) . '</textarea>';
	echo '<span class="description">Una por línea. Las noticias no pueden publicarse sin fuentes con fecha de consulta.</span></p>';
}

add_action( 'save_post_post', function ( $post_id ) {
	if ( ! isset( $_POST['zona_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['zona_meta_nonce'] ), 'zona_meta' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	if ( isset( $_POST['zona_formato'] ) ) {
		update_post_meta( $post_id, 'zona_formato', sanitize_key( wp_unslash( $_POST['zona_formato'] ) ) );
	}
	if ( isset( $_POST['zona_fuentes_txt'] ) ) {
		$sources = array();
		foreach ( preg_split( '/\R/', (string) wp_unslash( $_POST['zona_fuentes_txt'] ) ) as $line ) {
			$parts = array_map( 'trim', explode( '|', $line ) );
			if ( count( $parts ) >= 2 ) {
				$sources[] = array( 'title' => $parts[0], 'url' => $parts[1], 'publisher' => $parts[2] ?? '', 'accessed' => $parts[3] ?? '' );
			}
		}
		update_post_meta( $post_id, 'zona_fuentes', zona_sanitize_sources_json( wp_json_encode( $sources ) ) );
	}
}, 5 );
