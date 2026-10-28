<?php
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
	<article <?php post_class( 'article wrap' ); ?>>
		<?php zona_breadcrumbs(); ?>
		<header class="article__head">
			<h1 class="article__title"><?php the_title(); ?></h1>
			<p class="article__meta">Última revisión: <time datetime="<?php echo esc_attr( get_the_modified_date( 'c' ) ); ?>"><?php echo esc_html( get_the_modified_date( 'j \d\e F \d\e Y' ) ); ?></time></p>
		</header>
		<div class="prose"><?php the_content(); ?></div>
	</article>
	<?php
endwhile;
get_footer();
