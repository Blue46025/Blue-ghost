<?php
/**
 * Portada: destacados, lo último con columna lateral y bloques por sección.
 * En páginas 2+ muestra el archivo cronológico.
 */
defined( 'ABSPATH' ) || exit;
get_header();

if ( is_paged() ) {
	get_template_part( 'template-parts/archive-loop', null, array( 'title' => 'Todos los artículos' ) );
	get_footer();
	return;
}

$shown = array();
$top = new WP_Query( array( 'posts_per_page' => 5, 'ignore_sticky_posts' => false, 'no_found_rows' => true ) );
?>
<div class="wrap">
	<h1 class="sr-only"><?php bloginfo( 'name' ); ?>: <?php bloginfo( 'description' ); ?></h1>
	<?php if ( $top->have_posts() ) : ?>
	<section class="home-top" aria-label="Destacados">
		<?php
		$i = 0;
		while ( $top->have_posts() ) :
			$top->the_post();
			$shown[] = get_the_ID();
			if ( 0 === $i ) {
				echo '<div class="home-top__lead">';
				get_template_part( 'template-parts/card', null, array( 'variant' => 'lead', 'eager' => true ) );
				echo '</div><div class="home-top__side">';
			} else {
				get_template_part( 'template-parts/card', null, array( 'variant' => 'side' ) );
			}
			$i++;
		endwhile;
		echo $i > 0 ? '</div>' : '';
		wp_reset_postdata();
		?>
	</section>
	<?php endif; ?>

	<div class="with-aside">
		<section class="river" aria-labelledby="latest-h">
			<h2 id="latest-h" class="section-title">Lo último</h2>
			<?php
			$latest = new WP_Query( array( 'posts_per_page' => 8, 'post__not_in' => $shown, 'ignore_sticky_posts' => true, 'no_found_rows' => true ) );
			while ( $latest->have_posts() ) :
				$latest->the_post();
				$shown[] = get_the_ID();
				get_template_part( 'template-parts/card', null, array( 'variant' => 'row' ) );
			endwhile;
			wp_reset_postdata();
			?>
			<p class="more-wrap"><a class="btn btn--ghost" href="<?php echo esc_url( get_pagenum_link( 2 ) ); ?>">Ver todos los artículos</a></p>
		</section>
		<aside class="aside" aria-label="Secciones y publicidad">
			<div class="aside__sticky">
				<nav class="aside__box" aria-labelledby="sec-h">
					<h2 id="sec-h" class="aside__h">Secciones</h2>
					<ul class="aside__list">
						<?php foreach ( zona_root_categories_with_posts() as $t ) : ?>
							<li><a href="<?php echo esc_url( get_term_link( $t ) ); ?>"><span class="kicker__dot" style="--dot:<?php echo esc_attr( zona_color_of( $t ) ); ?>"></span><?php echo esc_html( $t->name ); ?></a></li>
						<?php endforeach; ?>
					</ul>
				</nav>
				<?php zona_ad( 'ad-lateral' ); ?>
			</div>
		</aside>
	</div>

	<?php
	$n = 0;
	foreach ( zona_root_categories_with_posts() as $t ) :
		$q = new WP_Query( array( 'cat' => $t->term_id, 'posts_per_page' => 4, 'ignore_sticky_posts' => true, 'no_found_rows' => true ) );
		if ( ! $q->have_posts() ) {
			continue;
		}
		?>
		<section class="home-section" style="--cat:<?php echo esc_attr( zona_color_of( $t ) ); ?>" aria-labelledby="s-<?php echo esc_attr( $t->slug ); ?>">
			<header class="home-section__head">
				<h2 id="s-<?php echo esc_attr( $t->slug ); ?>" class="section-title"><a href="<?php echo esc_url( get_term_link( $t ) ); ?>"><?php echo esc_html( $t->name ); ?></a></h2>
				<a class="more" href="<?php echo esc_url( get_term_link( $t ) ); ?>">Ver sección →</a>
			</header>
			<div class="grid grid--4">
				<?php
				while ( $q->have_posts() ) :
					$q->the_post();
					get_template_part( 'template-parts/card' );
				endwhile;
				wp_reset_postdata();
				?>
			</div>
		</section>
		<?php
		if ( 1 === ++$n % 2 ) {
			zona_ad( 'ad-portada' );
		}
	endforeach;
	?>
</div>
<?php
get_footer();
