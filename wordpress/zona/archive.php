<?php
defined( 'ABSPATH' ) || exit;
get_header();
get_template_part( 'template-parts/archive-loop', null, array(
	'title'       => is_category() || is_tag() ? single_term_title( '', false ) : wp_strip_all_tags( get_the_archive_title() ),
	'description' => wp_strip_all_tags( term_description() ),
) );
get_footer();
