<?php
/**
 * Enlaces de afiliación: se detectan por dominio, se marcan con rel="sponsored nofollow noopener"
 * y una etiqueta visible, y el artículo muestra un aviso de transparencia.
 * También ofrece el shortcode [producto] para recomendar un producto sin precio inventado.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Patrones orientativos de redes de afiliación. Revisarlos al aprobar cada programa.
 * Amazon solo cuenta como afiliado si el enlace lleva el parámetro tag=.
 */
function zona_default_affiliate_patterns() {
	return implode( "\n", array(
		'amazon.es?tag=',
		'amzn.to',
		'awin1.com',
		'clk.tradedoubler.com',
		'tc.tradetracker.net',
		'track.webgains.com',
		'anrdoezrs.net',
		'jdoqocy.com',
		'tkqlhce.com',
		'dpbolvw.net',
		'kqzyfj.com',
		'sjv.io',
		'pxf.io',
	) );
}

function zona_affiliate_patterns() {
	$raw = get_option( 'zona_affiliate_patterns', zona_default_affiliate_patterns() );
	return array_values( array_filter( array_map( 'trim', preg_split( '/\R/', (string) $raw ) ) ) );
}

/**
 * ¿Es un enlace de afiliación? Patrón "dominio" o "dominio?parámetro=".
 */
function zona_is_affiliate_url( $url ) {
	$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );
	$query = (string) wp_parse_url( $url, PHP_URL_QUERY );
	if ( ! $host ) {
		return false;
	}
	foreach ( zona_affiliate_patterns() as $pattern ) {
		$parts = explode( '?', strtolower( $pattern ), 2 );
		$domain = $parts[0];
		if ( $host !== $domain && ! str_ends_with( $host, '.' . $domain ) ) {
			continue;
		}
		if ( isset( $parts[1] ) && '' !== $parts[1] ) {
			parse_str( $query, $q );
			if ( ! array_key_exists( rtrim( $parts[1], '=' ), $q ) ) {
				continue;
			}
		}
		return true;
	}
	return false;
}

/**
 * Marca los enlaces afiliados del contenido. Devuelve [html, encontrado].
 */
function zona_mark_affiliate_links( $html ) {
	$found = false;
	if ( false === stripos( $html, '<a ' ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		return array( $html, false );
	}
	$p = new WP_HTML_Tag_Processor( $html );
	while ( $p->next_tag( 'a' ) ) {
		$href = (string) $p->get_attribute( 'href' );
		if ( ! zona_is_affiliate_url( $href ) ) {
			continue;
		}
		$found = true;
		$p->set_attribute( 'rel', 'sponsored nofollow noopener' );
		$p->add_class( 'aff' );
		$p->set_attribute( 'data-aff', '1' );
	}
	$html = $p->get_updated_html();
	// Etiqueta visible tras cada enlace afiliado.
	$html = preg_replace( '#(<a\b[^>]*data-aff="1"[^>]*>.*?</a>)#s', '$1<span class="aff-tag">Enlace afiliado</span>', $html );
	return array( $html, $found );
}

add_filter( 'the_content', function ( $content ) {
	if ( ! in_the_loop() || ! is_main_query() ) {
		return $content;
	}
	list( $content, $found ) = zona_mark_affiliate_links( $content );
	if ( $found ) {
		$policy = get_page_by_path( 'afiliacion-y-publicidad' );
		$link = $policy ? ' <a href="' . esc_url( get_permalink( $policy ) ) . '">Más información</a>.' : '';
		$content = '<aside class="zona-disclosure" role="note"><strong>Transparencia:</strong> este artículo incluye enlaces de afiliación, marcados como tales. Si compras a través de ellos podemos recibir una comisión, sin coste adicional para ti. No condiciona nuestras conclusiones.' . $link . '</aside>' . $content;
	}
	return $content;
}, 20 );

/**
 * [producto nombre="…" comercio="…" url="…" motivo="…"]
 * Sin precio a propósito: los precios cambian y solo se publican comprobados y fechados.
 */
add_shortcode( 'producto', function ( $atts ) {
	$a = shortcode_atts( array( 'nombre' => '', 'comercio' => '', 'url' => '', 'motivo' => '' ), $atts, 'producto' );
	$url = esc_url( $a['url'], array( 'http', 'https' ) );
	if ( ! $a['nombre'] || ! $url ) {
		return '';
	}
	$aff = zona_is_affiliate_url( $url );
	$merchant = $a['comercio'] ? $a['comercio'] : (string) wp_parse_url( $url, PHP_URL_HOST );
	return sprintf(
		'<div class="zona-product"><div class="zona-product__body"><p class="zona-product__name">%1$s</p>%2$s<p class="zona-product__note">Consulta el precio, la disponibilidad y las condiciones vigentes en la web del comercio.</p></div><a class="zona-product__btn" href="%3$s" rel="%4$s"%5$s>Ver en %6$s</a></div>',
		esc_html( $a['nombre'] ),
		$a['motivo'] ? '<p class="zona-product__why">' . esc_html( $a['motivo'] ) . '</p>' : '',
		$url,
		$aff ? 'sponsored nofollow noopener' : 'noopener',
		$aff ? ' data-aff="1"' : '',
		esc_html( $merchant )
	);
} );

// Ajustes: patrones de afiliación editables.
add_action( 'admin_menu', function () {
	add_options_page( 'Zona de Oferta', 'Zona de Oferta', 'manage_options', 'zona-core', 'zona_render_settings' );
} );
add_action( 'admin_init', function () {
	register_setting( 'zona_core', 'zona_affiliate_patterns', array(
		'type'              => 'string',
		'sanitize_callback' => function ( $v ) {
			return implode( "\n", array_filter( array_map( 'sanitize_text_field', preg_split( '/\R/', (string) $v ) ) ) );
		},
	) );
} );

function zona_render_settings() {
	echo '<div class="wrap"><h1>Zona de Oferta</h1><form method="post" action="options.php">';
	settings_fields( 'zona_core' );
	echo '<h2>Dominios de afiliación</h2><p>Los enlaces a estos dominios se marcan automáticamente como publicidad (<code>rel="sponsored"</code>, etiqueta visible y aviso). Uno por línea. Formato <code>dominio</code> o <code>dominio?parámetro=</code>.</p>';
	echo '<textarea name="zona_affiliate_patterns" rows="14" cols="60" class="large-text code">' . esc_textarea( implode( "\n", zona_affiliate_patterns() ) ) . '</textarea>';
	submit_button();
	echo '</form></div>';
}
