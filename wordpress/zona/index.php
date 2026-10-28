<?php
defined( 'ABSPATH' ) || exit;
get_header();
get_template_part( 'template-parts/archive-loop', null, array( 'title' => wp_strip_all_tags( get_the_archive_title() ) ) );
get_footer();
