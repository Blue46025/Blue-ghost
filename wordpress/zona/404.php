<?php
defined( 'ABSPATH' ) || exit;
get_header();
?>
<div class="wrap empty">
	<h1 class="section-head__title">No encontramos esta página</h1>
	<p>Puede que haya cambiado de dirección. Prueba a buscarla:</p>
	<?php get_search_form(); ?>
	<p>O vuelve a la <a href="<?php echo esc_url( home_url( '/' ) ); ?>">portada</a>.</p>
</div>
<?php
get_footer();
