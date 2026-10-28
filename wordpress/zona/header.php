<?php defined( 'ABSPATH' ) || exit; ?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip" href="#contenido">Saltar al contenido</a>
<?php if ( '0' === (string) get_option( 'blog_public' ) ) : ?>
<div class="private-bar" role="note">Sitio en preparación · oculto a los buscadores</div>
<?php endif; ?>
<header class="masthead">
	<div class="masthead__inner wrap">
		<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
			<?php if ( has_custom_logo() ) : ?>
				<?php echo wp_get_attachment_image( get_theme_mod( 'custom_logo' ), 'full', false, array( 'class' => 'brand__logo', 'alt' => '' ) ); ?>
			<?php else : ?>
				<svg aria-hidden="true" class="brand__mark" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M9 10h14L9 22h14" fill="none" stroke="var(--on-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
			<?php endif; ?>
			<span class="brand__name"><?php bloginfo( 'name' ); ?></span>
		</a>
		<div class="masthead__tools">
			<form class="hsearch" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
				<label class="sr-only" for="hsearch-q">Buscar en <?php bloginfo( 'name' ); ?></label>
				<input id="hsearch-q" type="search" name="s" placeholder="Buscar" value="<?php echo esc_attr( get_search_query() ); ?>">
				<button type="submit" class="icon-btn" aria-label="Buscar"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
			</form>
			<button class="icon-btn" type="button" data-theme-toggle aria-label="Cambiar tema. Actual: sistema"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button>
		</div>
	</div>
	<nav class="catnav" aria-label="Secciones">
		<div class="wrap">
			<?php
			wp_nav_menu( array(
				'theme_location' => 'principal',
				'container'      => false,
				'menu_class'     => 'catnav__list',
				'depth'          => 1,
				'fallback_cb'    => 'zona_fallback_menu',
			) );
			?>
		</div>
	</nav>
</header>
<?php zona_ad( 'ad-cabecera', 'wrap' ); ?>
<main id="contenido" tabindex="-1">
