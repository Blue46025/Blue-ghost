<?php
/**
 * Plugin Name:       Zona de Oferta · Núcleo
 * Description:       Categorías, fuentes y formato de los artículos, enlaces de afiliación identificados, cuadro de producto, salvaguardas editoriales y SEO básico. Independiente del tema.
 * Version:           0.1.0
 * Requires at least: 6.2
 * Requires PHP:      8.0
 * Author:            Zona de Oferta
 * License:           GPL-2.0-or-later
 * Text Domain:       zona-core
 */

defined( 'ABSPATH' ) || exit;

define( 'ZONA_CORE_DIR', plugin_dir_path( __FILE__ ) );
define( 'ZONA_CORE_VERSION', '0.1.0' );

require ZONA_CORE_DIR . 'inc/taxonomy.php';
require ZONA_CORE_DIR . 'inc/meta.php';
require ZONA_CORE_DIR . 'inc/affiliate.php';
require ZONA_CORE_DIR . 'inc/editorial.php';
require ZONA_CORE_DIR . 'inc/seo.php';

register_activation_hook( __FILE__, 'zona_core_activate' );

function zona_core_activate() {
	zona_create_categories();
	zona_register_roles();
	zona_set_permalinks( false );
	if ( false === get_option( 'zona_affiliate_patterns' ) ) {
		update_option( 'zona_affiliate_patterns', zona_default_affiliate_patterns() );
	}
}

/**
 * Enlaces descriptivos: /seccion/tecnologia/ para secciones y /tecnologia/hardware/articulo/ para artículos.
 * Sin $force solo actúa si el sitio aún usa los enlaces "simples" (?p=123): no pisa una configuración existente.
 * Usa WP_Rewrite directamente: actualizar la opción y regenerar en la misma petición dejaría las reglas antiguas.
 */
function zona_set_permalinks( $force ) {
	global $wp_rewrite;
	if ( $force || '' === get_option( 'permalink_structure' ) ) {
		$wp_rewrite->set_permalink_structure( '/%category%/%postname%/' );
		if ( '' === get_option( 'category_base' ) ) {
			$wp_rewrite->set_category_base( 'seccion' );
		}
	}
	flush_rewrite_rules();
}
