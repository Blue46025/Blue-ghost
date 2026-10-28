<?php
/**
 * Categorías jerárquicas a partir de taxonomy.json y color por sección (metadato de término).
 */

defined( 'ABSPATH' ) || exit;

function zona_taxonomy_definition() {
	static $data = null;
	if ( null === $data ) {
		$data = json_decode( (string) file_get_contents( ZONA_CORE_DIR . 'taxonomy.json' ), true );
	}
	return is_array( $data ) ? $data : array( 'categories' => array() );
}

/**
 * Crea las categorías que falten. No renombra, mueve ni borra categorías existentes.
 */
function zona_create_categories() {
	foreach ( zona_taxonomy_definition()['categories'] as $cat ) {
		$parent_id = zona_ensure_term( $cat['slug'], $cat['name'], $cat['description'] ?? '', 0 );
		if ( $parent_id && ! empty( $cat['color'] ) && ! get_term_meta( $parent_id, 'zona_color', true ) ) {
			update_term_meta( $parent_id, 'zona_color', sanitize_hex_color( $cat['color'] ) );
		}
		foreach ( $cat['children'] ?? array() as $child ) {
			zona_ensure_term( $child['slug'], $child['name'], $child['description'] ?? '', $parent_id );
		}
	}
}

function zona_ensure_term( $slug, $name, $description, $parent ) {
	$existing = get_term_by( 'slug', $slug, 'category' );
	if ( $existing ) {
		return (int) $existing->term_id;
	}
	$res = wp_insert_term( $name, 'category', array( 'slug' => $slug, 'description' => $description, 'parent' => (int) $parent ) );
	return is_wp_error( $res ) ? 0 : (int) $res['term_id'];
}

/**
 * Color de la sección de un término (o de su categoría raíz). Gris neutro si no tiene.
 */
function zona_category_color( $term ) {
	$term = get_term( $term, 'category' );
	if ( ! $term || is_wp_error( $term ) ) {
		return '#5C574F';
	}
	$root = $term;
	while ( $root->parent ) {
		$root = get_term( $root->parent, 'category' );
	}
	$color = get_term_meta( $root->term_id, 'zona_color', true );
	return $color ? $color : '#5C574F';
}
