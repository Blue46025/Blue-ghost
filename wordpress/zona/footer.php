<?php defined( 'ABSPATH' ) || exit; ?>
</main>
<footer class="footer">
	<div class="wrap footer__grid">
		<div>
			<a class="brand brand--footer" href="<?php echo esc_url( home_url( '/' ) ); ?>"><span class="brand__name"><?php bloginfo( 'name' ); ?></span></a>
			<p class="footer__claim"><?php bloginfo( 'description' ); ?></p>
			<p class="footer__claim">Sin registros, sin suscripciones y sin formularios. Los precios de los comercios pueden cambiar: confirma siempre las condiciones en la web del vendedor.</p>
		</div>
		<div>
			<h2 class="footer__h">Secciones</h2>
			<ul class="footer__list">
				<?php foreach ( zona_root_categories_with_posts() as $t ) : ?>
					<li><a href="<?php echo esc_url( get_term_link( $t ) ); ?>"><?php echo esc_html( $t->name ); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</div>
		<div>
			<h2 class="footer__h">Transparencia</h2>
			<?php
			wp_nav_menu( array(
				'theme_location' => 'pie',
				'container'      => false,
				'menu_class'     => 'footer__list',
				'depth'          => 1,
				'fallback_cb'    => function () {
					echo '<ul class="footer__list">';
					wp_list_pages( array( 'title_li' => '', 'depth' => 1 ) );
					echo '</ul>';
				},
			) );
			?>
		</div>
	</div>
	<p class="wrap footer__small">© <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?></p>
</footer>
<?php wp_footer(); ?>
</body>
</html>
