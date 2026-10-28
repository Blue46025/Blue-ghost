<?php
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$sources = function_exists( 'zona_get_sources' ) ? zona_get_sources( get_the_ID() ) : array();
	$updated = get_the_modified_date( 'Y-m-d' ) !== get_the_date( 'Y-m-d' );
	?>
	<article <?php post_class( 'article wrap' ); ?>>
		<?php zona_breadcrumbs(); ?>
		<header class="article__head">
			<?php zona_kicker(); ?>
			<h1 class="article__title"><?php the_title(); ?></h1>
			<?php if ( has_excerpt() ) : ?><p class="article__dek"><?php echo esc_html( get_the_excerpt() ); ?></p><?php endif; ?>
			<p class="article__meta">
				<?php echo esc_html( get_the_author() ); ?> ·
				<time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date( 'j \d\e F \d\e Y' ) ); ?></time>
				<?php if ( $updated ) : ?> · Actualizado el <time datetime="<?php echo esc_attr( get_the_modified_date( 'c' ) ); ?>"><?php echo esc_html( get_the_modified_date( 'j \d\e F \d\e Y' ) ); ?></time><?php endif; ?>
				· <?php echo (int) zona_reading_minutes(); ?> min de lectura
			</p>
		</header>
		<figure class="article__cover"><?php zona_cover( 'post-thumbnail', true ); ?></figure>
		<div class="article__layout">
			<div class="prose">
				<nav class="toc" aria-label="Índice del artículo" data-toc hidden><details open><summary>En este artículo</summary><ol></ol></details></nav>
				<?php the_content(); ?>
				<?php if ( $sources ) : ?>
					<section class="sources" aria-labelledby="fuentes-h">
						<h2 id="fuentes-h">Fuentes</h2>
						<ol>
							<?php foreach ( $sources as $s ) : ?>
								<li><a href="<?php echo esc_url( $s['url'] ); ?>" rel="noopener"><?php echo esc_html( $s['title'] ); ?></a><?php echo ! empty( $s['publisher'] ) ? ' <span class="muted">· ' . esc_html( $s['publisher'] ) . '</span>' : ''; ?><?php echo ! empty( $s['accessed'] ) ? ' <span class="muted">· consultada el ' . esc_html( wp_date( 'j \d\e F \d\e Y', strtotime( $s['accessed'] ) ) ) . '</span>' : ''; ?></li>
							<?php endforeach; ?>
						</ol>
					</section>
				<?php endif; ?>
				<?php
				$tags = get_the_tags();
				if ( $tags ) :
					?>
					<ul class="tags" aria-label="Etiquetas">
						<?php foreach ( $tags as $t ) : ?>
							<li><a class="chip" href="<?php echo esc_url( get_tag_link( $t ) ); ?>"><?php echo esc_html( $t->name ); ?></a></li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
				<?php zona_ad( 'ad-final' ); ?>
			</div>
			<aside class="aside" aria-label="Relacionado y publicidad">
				<div class="aside__sticky">
					<?php zona_ad( 'ad-lateral' ); ?>
				</div>
			</aside>
		</div>
	</article>
	<?php
	$related = zona_related_posts( get_the_ID(), 3 );
	if ( $related ) :
		?>
		<section class="related wrap" aria-labelledby="rel-h">
			<h2 id="rel-h" class="section-title">Para seguir leyendo</h2>
			<div class="grid grid--3">
				<?php
				foreach ( $related as $post ) :
					setup_postdata( $post );
					get_template_part( 'template-parts/card' );
				endforeach;
				wp_reset_postdata();
				?>
			</div>
		</section>
		<?php
	endif;
endwhile;
get_footer();
