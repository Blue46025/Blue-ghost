<?php
/**
 * Tarjeta de artículo. $args['variant']: default | lead | side | row | compact. $args['eager']: bool.
 */
defined( 'ABSPATH' ) || exit;
$variant = $args['variant'] ?? 'default';
$eager = ! empty( $args['eager'] );
$size = 'lead' === $variant ? 'post-thumbnail' : ( in_array( $variant, array( 'compact', 'row' ), true ) ? 'zona-thumb' : 'zona-card' );
$tag = 'lead' === $variant ? 'h2' : 'h3';
?>
<article class="card card--<?php echo esc_attr( $variant ); ?>">
	<a class="card__link" href="<?php the_permalink(); ?>">
		<div class="card__media"><?php zona_cover( $size, $eager ); ?></div>
		<div class="card__body">
			<?php zona_kicker(); ?>
			<<?php echo $tag; ?> class="card__title"><?php the_title(); ?></<?php echo $tag; ?>>
			<?php if ( 'compact' !== $variant ) : ?>
				<p class="card__dek"><?php echo esc_html( get_the_excerpt() ); ?></p>
			<?php endif; ?>
			<span class="card__meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date( 'j M Y' ) ); ?></time> · <?php echo (int) zona_reading_minutes(); ?> min</span>
		</div>
	</a>
</article>
