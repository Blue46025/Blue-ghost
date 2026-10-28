<?php
/**
 * SEO básico: descripción, datos estructurados y noindex en búsquedas internas.
 * Se desactiva solo si hay un plugin SEO (Yoast, Rank Math, SEOPress, AIOSEO) para no duplicar.
 */

defined( 'ABSPATH' ) || exit;

function zona_seo_plugin_active() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || defined( 'AIOSEO_VERSION' );
}

function zona_meta_description() {
	if ( is_singular() ) {
		$text = has_excerpt() ? get_the_excerpt() : wp_trim_words( wp_strip_all_tags( get_post_field( 'post_content', get_queried_object_id() ) ), 30, '…' );
	} elseif ( is_category() || is_tag() ) {
		$text = term_description();
	} else {
		$text = get_bloginfo( 'description' );
	}
	$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $text ) ) );
	return mb_strlen( $text ) > 160 ? mb_substr( $text, 0, 157 ) . '…' : $text;
}

add_action( 'wp_head', function () {
	if ( zona_seo_plugin_active() ) {
		return;
	}
	$desc = zona_meta_description();
	if ( $desc ) {
		echo '<meta name="description" content="' . esc_attr( $desc ) . "\">\n";
	}
	echo '<meta property="og:site_name" content="' . esc_attr( get_bloginfo( 'name' ) ) . "\">\n";
	echo '<meta property="og:locale" content="es_ES">' . "\n";
	if ( is_singular() ) {
		echo '<meta property="og:type" content="article">' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( get_the_title() ) . "\">\n";
		echo '<meta property="og:url" content="' . esc_url( get_permalink() ) . "\">\n";
		if ( has_post_thumbnail() ) {
			echo '<meta property="og:image" content="' . esc_url( get_the_post_thumbnail_url( null, 'large' ) ) . "\">\n";
		}
	}
	foreach ( zona_jsonld() as $obj ) {
		echo '<script type="application/ld+json">' . wp_json_encode( $obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . "</script>\n";
	}
}, 2 );

function zona_jsonld() {
	$org = array( '@type' => 'Organization', 'name' => get_bloginfo( 'name' ), 'url' => home_url( '/' ) );
	$out = array();
	if ( is_front_page() || is_home() ) {
		$out[] = array(
			'@context'        => 'https://schema.org',
			'@type'           => 'WebSite',
			'name'            => get_bloginfo( 'name' ),
			'url'             => home_url( '/' ),
			'inLanguage'      => 'es-ES',
			'potentialAction' => array(
				'@type'       => 'SearchAction',
				'target'      => array( '@type' => 'EntryPoint', 'urlTemplate' => home_url( '/?s={search_term_string}' ) ),
				'query-input' => 'required name=search_term_string',
			),
		);
	}
	if ( is_singular( 'post' ) ) {
		$id = get_queried_object_id();
		$article = array(
			'@context'         => 'https://schema.org',
			'@type'            => 'noticia' === zona_get_format( $id ) ? 'NewsArticle' : 'Article',
			'headline'         => mb_substr( get_the_title( $id ), 0, 110 ),
			'description'      => zona_meta_description(),
			'inLanguage'       => 'es-ES',
			'datePublished'    => get_the_date( 'c', $id ),
			'dateModified'     => get_the_modified_date( 'c', $id ),
			'author'           => $org,
			'publisher'        => $org,
			'mainEntityOfPage' => get_permalink( $id ),
		);
		if ( has_post_thumbnail( $id ) ) {
			$article['image'] = get_the_post_thumbnail_url( $id, 'large' );
		}
		$out[] = $article;
	}
	$crumbs = function_exists( 'zona_breadcrumb_items' ) ? zona_breadcrumb_items() : array();
	if ( count( $crumbs ) > 1 ) {
		$out[] = array(
			'@context'        => 'https://schema.org',
			'@type'           => 'BreadcrumbList',
			'itemListElement' => array_map( function ( $c, $i ) {
				return array( '@type' => 'ListItem', 'position' => $i + 1, 'name' => $c['name'], 'item' => $c['url'] );
			}, $crumbs, array_keys( $crumbs ) ),
		);
	}
	return $out;
}

// Búsquedas internas y secciones todavía vacías no deben indexarse.
add_filter( 'wp_robots', function ( $robots ) {
	global $wp_query;
	if ( is_search() || ( is_archive() && 0 === (int) $wp_query->found_posts ) ) {
		$robots['noindex'] = true;
		$robots['follow'] = true;
	}
	return $robots;
} );

/**
 * Migas de pan: Portada › categoría padre › subcategoría › artículo.
 */
function zona_breadcrumb_items() {
	$items = array( array( 'name' => 'Portada', 'url' => home_url( '/' ) ) );
	$add_cat = function ( $term ) use ( &$items ) {
		$chain = array();
		while ( $term && ! is_wp_error( $term ) ) {
			array_unshift( $chain, $term );
			$term = $term->parent ? get_term( $term->parent, 'category' ) : null;
		}
		foreach ( $chain as $t ) {
			$items[] = array( 'name' => $t->name, 'url' => get_term_link( $t ) );
		}
	};
	if ( is_singular( 'post' ) ) {
		$cat = zona_primary_category( get_queried_object_id() );
		if ( $cat ) {
			$add_cat( $cat );
		}
		$items[] = array( 'name' => get_the_title(), 'url' => get_permalink() );
	} elseif ( is_category() ) {
		$add_cat( get_queried_object() );
	} elseif ( is_page() ) {
		$items[] = array( 'name' => get_the_title(), 'url' => get_permalink() );
	} elseif ( is_search() ) {
		$items[] = array( 'name' => 'Buscar', 'url' => home_url( '/?s=' . rawurlencode( get_search_query() ) ) );
	} elseif ( is_tag() ) {
		$items[] = array( 'name' => single_tag_title( '', false ), 'url' => get_term_link( get_queried_object() ) );
	}
	return count( $items ) > 1 ? $items : array();
}

/**
 * Categoría principal: la más profunda de las asignadas (la subcategoría si existe).
 */
function zona_primary_category( $post_id ) {
	$cats = get_the_category( $post_id );
	if ( ! $cats ) {
		return null;
	}
	usort( $cats, function ( $a, $b ) {
		return count( get_ancestors( $b->term_id, 'category' ) ) - count( get_ancestors( $a->term_id, 'category' ) );
	} );
	return $cats[0];
}
