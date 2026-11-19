# Kinoo · Prototipo final v1

Mockup navegable de Kinoo, con un catálogo de 47 películas reales (póster, ficha y plataforma), con los flujos de **Descubrir** (mazos → cartas → resumen → ticket) y **Ver** (carta del día, comodín, plataforma, calificación y flujo fuera de la app).

**Demo:** https://montenegroc597-web.github.io/Kinoo-Mockup-/

- En computador: el celular aparece centrado sobre fondo café, con accesos rápidos a cada flujo.
- En celular: la app se ajusta a la pantalla.
- El mazo que eliges en D1 y tus swipes se guardan en el navegador: el cierre, el ticket y las recomendaciones usan esas películas. "Reiniciar" lo borra.
- Al cerrar cada mazo aparece un minijuego distinto (6 en total).

## Estructura

```
index.html          contenedor (desktop / móvil)
screens/            una pantalla por archivo (Final_*.dc.html)
assets/             portadas, logos e ilustraciones
runtime/            Preact (MIT) + kinoo-dc.js, el renderer de las pantallas
```

Es un sitio estático: para correrlo local basta `python3 -m http.server` en la raíz.
