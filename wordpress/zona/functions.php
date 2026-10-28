<?php
/**
 * Tema Zona · funciones. Sin dependencias externas ni fuentes de terceros.
 */

defined( 'ABSPATH' ) || exit;

define( 'ZONA_THEME_VERSION', '0.1.0' );

add_action( 'after_setup_theme', function () {
	load_theme_textdomain( 'zona', get_template_directory() . '/languages' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
	add_theme_support( 'custom-logo', array( 'height' => 64, 'width' => 64, 'flex-width' => true ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'editor-styles' );
	add_editor_style( 'assets/editor.css' );
	set_post_thumbnail_size( 1200, 675, true );
	add_image_size( 'zona-card', 640, 360, true );
	add_image_size( 'zona-thumb', 320, 180, true );
	register_nav_menus( array(
		'principal' => 'Menú principal (secciones)',
		'pie'       => 'Menú del pie (legal y transparencia)',
	) );
} );

// Huecos publicitarios: zonas de widgets. Si están vacías no se imprime nada (sin cajas vacías).
add_action( 'widgets_init', function () {
	$areas = array(
		'ad-cabecera'  => array( 'Publicidad · bajo la cabecera', 'Banner horizontal bajo el menú en todas las páginas.' ),
		'ad-portada'   => array( 'Publicidad · portada entre secciones', 'Se muestra entre los bloques de secciones de la portada.' ),
		'ad-articulo'  => array( 'Publicidad · dentro del artículo', 'Se inserta tras el tercer párrafo de cada artículo.' ),
		'ad-lateral'   => array( 'Publicidad · columna lateral', 'Columna derecha en escritorio (artículos y portada).' ),
		'ad-final'     => array( 'Publicidad · final del artículo', 'Tras el contenido y antes de los artículos relacionados.' ),
	);
	foreach ( $areas as $id => $info ) {
		register_sidebar( array(
			'id'            => $id,
			'name'          => $info[0],
			'description'   => $info[1] . ' Usa un widget «HTML personalizado» con el código del anunciante. Debe identificarse como publicidad.',
			'before_widget' => '<div class="ad__unit">',
			'after_widget'  => '</div>',
			'before_title'  => '<span class="sr-only">',
			'after_title'   => '</span>',
		) );
	}
} );

function zona_ad( $area, $extra_class = '' ) {
	if ( ! is_active_sidebar( $area ) ) {
		return;
	}
	echo '<aside class="ad ad--' . esc_attr( $area ) . ' ' . esc_attr( $extra_class ) . '" aria-label="Publicidad"><span class="ad__label">Publicidad</span>';
	dynamic_sidebar( $area );
	echo '</aside>';
}

// Anuncio dentro del artículo, tras el tercer párrafo (solo si la zona tiene contenido).
add_filter( 'the_content', function ( $content ) {
	if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() || ! is_active_sidebar( 'ad-articulo' ) ) {
		return $content;
	}
	$parts = explode( '</p>', $content );
	if ( count( $parts ) < 5 ) {
		return $content;
	}
	ob_start();
	zona_ad( 'ad-articulo' );
	$ad = ob_get_clean();
	$parts[2] .= '</p>' . $ad;
	return implode( '</p>', array_slice( $parts, 0, 3 ) ) . implode( '</p>', array_slice( $parts, 3 ) );
}, 30 );

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( 'zona', get_stylesheet_uri(), array(), ZONA_THEME_VERSION );
	wp_enqueue_script( 'zona', get_template_directory_uri() . '/assets/js/zona.js', array(), ZONA_THEME_VERSION, array( 'strategy' => 'defer', 'in_footer' => false ) );
	// El tema no usa bloques de comentarios ni incrustaciones de terceros por defecto.
	wp_dequeue_style( 'classic-theme-styles' );
} );

// Aplica el tema guardado antes del primer pintado para evitar parpadeo.
add_action( 'wp_head', function () {
	echo "<script>(function(){try{var t=localStorage.getItem('zona-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();</script>\n";
	echo '<meta name="color-scheme" content="light dark">' . "\n";
	echo '<meta name="theme-color" content="#F5F3EE" media="(prefers-color-scheme: light)">' . "\n";
	echo '<meta name="theme-color" content="#16181C" media="(prefers-color-scheme: dark)">' . "\n";
}, 1 );

// Limpieza: sin emojis remotos ni generador de versión en el HTML.
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'emoji_svg_url', '__return_false' );

add_filter( 'excerpt_length', function () {
	return 32;
} );
add_filter( 'excerpt_more', function () {
	return '…';
} );

// Sin comentarios: el proyecto no recoge datos de lectores.
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );

/* ---------- Utilidades de plantilla ---------- */

function zona_cat_of( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	if ( function_exists( 'zona_primary_category' ) ) {
		return zona_primary_category( $post_id );
	}
	$cats = get_the_category( $post_id );
	return $cats ? $cats[0] : null;
}

function zona_color_of( $term ) {
	return function_exists( 'zona_category_color' ) && $term ? zona_category_color( $term ) : '#A3471F';
}

function zona_format_label( $post_id = null ) {
	if ( ! function_exists( 'zona_get_format' ) ) {
		return '';
	}
	$formats = zona_formats();
	return $formats[ zona_get_format( $post_id ? $post_id : get_the_ID() ) ] ?? '';
}

function zona_kicker( $post_id = null ) {
	$cat = zona_cat_of( $post_id );
	$fmt = zona_format_label( $post_id );
	echo '<span class="kicker">';
	if ( $cat ) {
		echo '<span class="kicker__dot" style="--dot:' . esc_attr( zona_color_of( $cat ) ) . '"></span>' . esc_html( $cat->name );
	}
	if ( $fmt ) {
		echo '<span class="kicker__sep" aria-hidden="true">·</span>' . esc_html( $fmt );
	}
	echo '</span>';
}

function zona_reading_minutes( $post_id = null ) {
	$words = str_word_count( wp_strip_all_tags( get_post_field( 'post_content', $post_id ? $post_id : get_the_ID() ) ) );
	return max( 1, (int) round( $words / 220 ) );
}

/**
 * Imagen destacada o, si no hay, portada generada con el color de la sección (sin imágenes de terceros).
 */
function zona_cover( $size = 'zona-card', $eager = false, $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	if ( has_post_thumbnail( $post_id ) ) {
		echo get_the_post_thumbnail( $post_id, $size, array(
			'class'         => 'cover',
			'alt'           => '',
			'loading'       => $eager ? 'eager' : 'lazy',
			'fetchpriority' => $eager ? 'high' : 'auto',
		) );
		return;
	}
	$cat = zona_cat_of( $post_id );
	$seed = crc32( get_post_field( 'post_name', $post_id ) );
	printf(
		'<span class="cover cover--gen" style="--c:%1$s;--x:%2$d%%;--y:%3$d%%" aria-hidden="true"><span class="cover__label">%4$s</span></span>',
		esc_attr( zona_color_of( $cat ) ),
		55 + $seed % 40,
		10 + ( $seed >> 8 ) % 70,
		esc_html( $cat ? $cat->name : '' )
	);
}

function zona_breadcrumbs() {
	if ( ! function_exists( 'zona_breadcrumb_items' ) ) {
		return;
	}
	$items = zona_breadcrumb_items();
	if ( ! $items ) {
		return;
	}
	echo '<nav class="crumbs" aria-label="Migas de pan"><ol>';
	$last = count( $items ) - 1;
	foreach ( $items as $i => $it ) {
		echo $i === $last
			? '<li><span aria-current="page">' . esc_html( $it['name'] ) . '</span></li>'
			: '<li><a href="' . esc_url( $it['url'] ) . '">' . esc_html( $it['name'] ) . '</a></li>';
	}
	echo '</ol></nav>';
}

/**
 * Categorías raíz con artículos publicados, en el orden de la taxonomía del plugin.
 */
function zona_root_categories_with_posts() {
	$order = array();
	if ( function_exists( 'zona_taxonomy_definition' ) ) {
		foreach ( zona_taxonomy_definition()['categories'] as $i => $c ) {
			$order[ $c['slug'] ] = $i;
		}
	}
	$roots = array_filter( get_categories( array( 'parent' => 0, 'hide_empty' => false ) ), function ( $t ) {
		if ( 'sin-categoria' === $t->slug || 'uncategorized' === $t->slug ) {
			return false;
		}
		$q = new WP_Query( array( 'cat' => $t->term_id, 'posts_per_page' => 1, 'fields' => 'ids', 'no_found_rows' => true ) );
		return $q->have_posts();
	} );
	usort( $roots, function ( $a, $b ) use ( $order ) {
		return ( $order[ $a->slug ] ?? 99 ) - ( $order[ $b->slug ] ?? 99 );
	} );
	return $roots;
}

// Menú de reserva: secciones con contenido si no se ha configurado un menú.
function zona_fallback_menu() {
	$current_root = zona_current_root_category_id();
	$current = is_category() ? get_queried_object_id() : ( is_singular( 'post' ) && zona_cat_of() ? zona_cat_of()->term_id : 0 );
	echo '<ul class="catnav__list">';
	foreach ( zona_root_categories_with_posts() as $t ) {
		printf( '<li><a href="%s"%s>%s</a></li>', esc_url( get_term_link( $t ) ), $t->term_id === $current_root && $t->term_id === $current ? ' aria-current="true"' : '', esc_html( $t->name ) );
		// Subsecciones con contenido justo después de su sección, para llegar en un clic a Pádel o Running.
		foreach ( get_categories( array( 'parent' => $t->term_id, 'hide_empty' => true ) ) as $child ) {
			printf( '<li><a href="%s"%s>%s</a></li>', esc_url( get_term_link( $child ) ), $child->term_id === $current ? ' aria-current="true"' : '', esc_html( $child->name ) );
		}
	}
	echo '</ul>';
}

// Sección raíz de la página actual (categoría o artículo), o 0.
function zona_current_root_category_id() {
	if ( is_category() ) {
		$term = get_queried_object();
	} elseif ( is_singular( 'post' ) ) {
		$term = zona_cat_of( get_queried_object_id() );
	} else {
		return 0;
	}
	if ( ! $term ) {
		return 0;
	}
	$ancestors = get_ancestors( $term->term_id, 'category' );
	return $ancestors ? (int) end( $ancestors ) : (int) $term->term_id;
}

function zona_related_posts( $post_id, $count = 3 ) {
	$cat = zona_cat_of( $post_id );
	if ( ! $cat ) {
		return array();
	}
	$q = new WP_Query( array(
		'cat'                 => $cat->parent ? $cat->parent : $cat->term_id,
		'post__not_in'        => array( $post_id ),
		'posts_per_page'      => $count,
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
	) );
	return $q->posts;
}
