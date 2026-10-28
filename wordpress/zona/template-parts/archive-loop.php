<?php
/**
 * Listado paginado común a categorías, etiquetas, búsquedas y archivo general.
 */
defined( 'ABSPATH' ) || exit;
$title = $args['title'] ?? '';
$desc = $args['description'] ?? '';
$term = is_category() ? get_queried_object() : null;
?>
<div class="wrap">
	<?php zona_breadcrumbs(); ?>
	<header class="section-head"<?php echo $term ? ' style="--cat:' . esc_attr( zona_color_of( $term ) ) . '"' : ''; ?>>
		<h1 class="section-head__title"><?php echo esc_html( $title ); ?></h1>
		<?php if ( $desc ) : ?><p class="section-head__dek"><?php echo esc_html( $desc ); ?></p><?php endif; ?>
		<?php
		if ( $term ) :
			$children = get_categories( array( 'parent' => $term->term_id, 'hide_empty' => true ) );
			if ( $children ) :
				?>
				<nav class="subnav" aria-label="Subsecciones"><ul>
					<?php foreach ( $children as $c ) : ?>
						<li><a class="chip" href="<?php echo esc_url( get_term_link( $c ) ); ?>"><?php echo esc_html( $c->name ); ?></a></li>
					<?php endforeach; ?>
				</ul></nav>
				<?php
			endif;
		endif;
		?>
		<?php if ( is_search() ) : ?>
			<form class="bigsearch" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
				<label class="sr-only" for="s-big">Términos de búsqueda</label>
				<input id="s-big" type="search" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="Busca guías, noticias o temas">
				<button class="btn" type="submit">Buscar</button>
			</form>
		<?php endif; ?>
	</header>
	<?php if ( have_posts() ) : ?>
		<div class="grid grid--3">
			<?php
			$first = true;
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/card', null, array( 'eager' => $first && ! is_paged() ) );
				$first = false;
			endwhile;
			?>
		</div>
		<?php
		the_posts_pagination( array(
			'mid_size'           => 1,
			'prev_text'          => '← Anteriores',
			'next_text'          => 'Siguientes →',
			'screen_reader_text' => 'Navegación de páginas',
		) );
		?>
	<?php else : ?>
		<p class="empty">No hay artículos que coincidan. Prueba con otros términos o vuelve a la <a href="<?php echo esc_url( home_url( '/' ) ); ?>">portada</a>.</p>
	<?php endif; ?>
</div>
