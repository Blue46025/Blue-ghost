<?php
defined( 'ABSPATH' ) || exit;
get_header();
global $wp_query;
get_template_part( 'template-parts/archive-loop', null, array(
	'title'       => get_search_query() ? sprintf( 'Resultados para «%s»', get_search_query() ) : 'Buscar',
	'description' => get_search_query() ? sprintf( _n( '%d resultado', '%d resultados', (int) $wp_query->found_posts, 'zona' ), (int) $wp_query->found_posts ) : '',
) );
get_footer();
