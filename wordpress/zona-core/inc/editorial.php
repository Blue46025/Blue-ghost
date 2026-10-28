<?php
/**
 * Salvaguardas editoriales.
 * - Una noticia publicada sin fuentes con fecha de consulta vuelve a "Pendiente de revisión".
 * - Usuario de automatización: rol "Redactor IA", que solo puede enviar a revisión (no publicar).
 */

defined( 'ABSPATH' ) || exit;

function zona_has_dated_source( array $sources ) {
	foreach ( $sources as $s ) {
		if ( ! empty( $s['accessed'] ) && ! empty( $s['url'] ) ) {
			return true;
		}
	}
	return false;
}

// API REST: se decide antes de guardar, para que la respuesta ya refleje el estado real.
add_filter( 'rest_pre_insert_post', function ( $prepared, $request ) {
	$status = $prepared->post_status ?? ( $prepared->ID ? get_post_status( $prepared->ID ) : '' );
	if ( 'publish' !== $status ) {
		return $prepared;
	}
	$meta = $request['meta'] ?? array();
	$format = $meta['zona_formato'] ?? ( $prepared->ID ? zona_get_format( $prepared->ID ) : 'guia' );
	if ( 'noticia' !== $format ) {
		return $prepared;
	}
	$sources = isset( $meta['zona_fuentes'] ) ? json_decode( zona_sanitize_sources_json( $meta['zona_fuentes'] ), true ) : ( $prepared->ID ? zona_get_sources( $prepared->ID ) : array() );
	if ( ! zona_has_dated_source( (array) $sources ) ) {
		$prepared->post_status = 'pending';
	}
	return $prepared;
}, 10, 2 );

function zona_enforce_news_sources( $post_id ) {
	$post = get_post( $post_id );
	if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status || 'noticia' !== zona_get_format( $post_id ) ) {
		return;
	}
	if ( zona_has_dated_source( zona_get_sources( $post_id ) ) ) {
		return;
	}
	remove_action( 'save_post_post', 'zona_enforce_news_sources', 20 );
	wp_update_post( array( 'ID' => $post_id, 'post_status' => 'pending' ) );
	add_action( 'save_post_post', 'zona_enforce_news_sources', 20 );
	set_transient( 'zona_notice_' . get_current_user_id(), 'La noticia se ha dejado en «Pendiente de revisión»: necesita al menos una fuente con fecha de consulta.', 60 );
}
add_action( 'save_post_post', 'zona_enforce_news_sources', 20 );
add_action( 'rest_after_insert_post', function ( $post ) {
	zona_enforce_news_sources( $post->ID );
}, 20 );

add_action( 'admin_notices', function () {
	$key = 'zona_notice_' . get_current_user_id();
	$msg = get_transient( $key );
	if ( $msg ) {
		delete_transient( $key );
		echo '<div class="notice notice-warning"><p>' . esc_html( $msg ) . '</p></div>';
	}
} );

// Rol para la automatización: escribe y envía a revisión; no publica, no sube archivos, no gestiona nada más.
function zona_register_roles() {
	if ( ! get_role( 'zona_redactor_ia' ) ) {
		add_role( 'zona_redactor_ia', 'Redactor IA (solo borradores)', array(
			'read'         => true,
			'edit_posts'   => true,
			'delete_posts' => true,
		) );
	}
}
add_action( 'init', 'zona_register_roles' );
