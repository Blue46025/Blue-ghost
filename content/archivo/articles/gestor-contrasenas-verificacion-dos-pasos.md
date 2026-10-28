---
{
  "title": "Gestor de contraseñas, verificación en dos pasos y llaves de acceso: configuración básica",
  "slug": "gestor-contrasenas-verificacion-dos-pasos",
  "category": "tecnologia",
  "subcategory": "software",
  "type": "guia",
  "date": "2026-10-28",
  "status": "borrador",
  "dek": "Tres medidas cubren la mayor parte del riesgo de que te roben una cuenta: contraseñas únicas guardadas en un gestor, un segundo factor que no sea el SMS cuando sea posible y llaves de acceso donde estén disponibles.",
  "description": "Cómo proteger tus cuentas: gestor de contraseñas, verificación en dos pasos con app o llave física, llaves de acceso (passkeys) y señales de phishing.",
  "tags": ["seguridad", "contraseñas", "2fa", "passkeys", "phishing", "privacidad"],
  "related": ["que-es-un-modelo-de-lenguaje", "wifi-6-6e-7-diferencias"],
  "sources": [
    { "title": "INCIBE: Ciudadanía", "url": "https://www.incibe.es/ciudadania", "publisher": "Instituto Nacional de Ciberseguridad" },
    { "title": "FIDO Alliance: Passkeys", "url": "https://fidoalliance.org/passkeys/", "publisher": "FIDO Alliance" }
  ]
}
---
La mayoría de robos de cuentas no requieren técnicas sofisticadas: aprovechan contraseñas reutilizadas que se filtraron en otro servicio o engañan al usuario para que las escriba en una página falsa. Las medidas siguientes atacan precisamente esos dos problemas.

## 1. Una contraseña distinta para cada servicio

Si reutilizas una contraseña y un servicio sufre una filtración, los atacantes la probarán automáticamente en otros. La solución práctica es un **gestor de contraseñas**:

- Genera contraseñas largas y aleatorias para cada sitio.
- Solo tienes que recordar una contraseña maestra, que debe ser larga (una frase de varias palabras funciona bien) y no usarse en ningún otro lugar.
- Rellena las contraseñas solo en el dominio correcto, lo que ayuda a detectar páginas falsas.

Los navegadores y sistemas operativos principales incluyen gestores integrados; también existen aplicaciones independientes. Lo importante es usar uno y activar en él la verificación en dos pasos.

## 2. Verificación en dos pasos

Añade un segundo requisito además de la contraseña. No todos los métodos ofrecen la misma protección:

| Método | Protección | Comentario |
|---|---|---|
| SMS | Básica | Mejor que nada, pero expuesto a duplicados fraudulentos de SIM y a interceptación |
| App de códigos (TOTP) | Buena | Los códigos se generan en tu dispositivo; un phishing elaborado aún puede capturarlos |
| Notificación en app | Buena | Cuidado con aprobar solicitudes que no has iniciado |
| Llave física o llave de acceso (FIDO2) | Muy alta | Resistente al phishing: solo funciona en el dominio legítimo |

> [!clave] Prioriza la verificación en dos pasos en el correo electrónico principal: quien controla tu correo puede restablecer las contraseñas del resto de tus cuentas.

## 3. Llaves de acceso (passkeys)

Las **llaves de acceso** sustituyen la contraseña por un par de claves criptográficas guardadas en tu dispositivo o gestor y desbloqueadas con tu huella, cara o PIN. No se pueden reutilizar ni escribir en una web falsa. Cada vez más servicios las admiten; actívalas donde estén disponibles.

## 4. No te quedes fuera de tus propias cuentas

- Guarda los **códigos de recuperación** de cada servicio en el gestor o impresos en un lugar seguro.
- Mantén actualizados el teléfono y el correo de recuperación.
- Si usas llave física, registra al menos dos.

## Señales de phishing

- Mensajes que meten prisa: bloqueo de cuenta, paquete retenido, multa pendiente.
- Enlaces cuyo dominio no coincide exactamente con el del servicio.
- Peticiones de códigos de verificación por teléfono o mensaje: ningún servicio legítimo te los pedirá.

Ante la duda, no pulses el enlace: entra en el servicio escribiendo tú la dirección. En España, el Instituto Nacional de Ciberseguridad (INCIBE) ofrece una línea gratuita de ayuda en ciberseguridad en el teléfono **017**.
