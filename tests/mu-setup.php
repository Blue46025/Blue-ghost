<?php
/**
 * Solo para pruebas locales (WordPress Playground). NO instalar en el servidor real.
 * Prepara el sitio una vez: activa plugin y tema, enlaces permanentes y contraseñas de aplicación.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', function () {
	// Playground fija su propia estructura de enlaces al instalar; se corrige en cada petición.
	if ( '/%category%/%postname%/' !== get_option( 'permalink_structure' ) && function_exists( 'zona_set_permalinks' ) ) {
		zona_set_permalinks( true );
	}
	if ( get_option( 'zona_test_ready' ) ) {
		return;
	}
	update_option( 'zona_test_ready', 1 );
	update_option( 'blogname', 'Zona de Oferta' );
	update_option( 'blogdescription', 'Entrenamiento, nutrición y material deportivo explicados con criterio' );
	update_option( 'timezone_string', 'Europe/Madrid' );
	update_option( 'blog_public', '0' );

	require_once ABSPATH . 'wp-admin/includes/plugin.php';
	activate_plugin( 'zona-core/zona-core.php' );
	switch_theme( 'zona' );

	$admin = get_user_by( 'login', 'admin' );
	list( $pass ) = WP_Application_Passwords::create_new_application_password( $admin->ID, array( 'name' => 'pruebas' ) );
	file_put_contents( ABSPATH . 'apppass.txt', $pass );

	$bot = wp_insert_user( array( 'user_login' => 'redactor-ia', 'user_pass' => wp_generate_password( 24 ), 'role' => 'zona_redactor_ia', 'display_name' => 'Redacción' ) );
	list( $pass2 ) = WP_Application_Passwords::create_new_application_password( $bot, array( 'name' => 'automatizacion' ) );
	file_put_contents( ABSPATH . 'apppass-ia.txt', $pass2 );
}, 99 );

// Traza de enrutado para pruebas: ?zona_debug muestra la regla de reescritura aplicada.
add_action( 'wp', function ( $wp ) {
	if ( isset( $_GET['zona_debug'] ) ) {
		header( 'Content-Type: text/plain' );
		echo 'request=' . $wp->request . "\nrule=" . $wp->matched_rule . "\nquery=" . wp_json_encode( $wp->query_vars ) . "\nuri=" . ( $_SERVER['REQUEST_URI'] ?? '' );
		exit;
	}
} );
