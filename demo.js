// and also · casos de ejemplo (respuestas preparadas y comprobadas a mano)
window.DEMO=(function(){
return {
bbc:{
 id:'bbc', titulo:'Midterms · BBC', elige:'Una captura de la BBC sobre las elecciones de EE. UU.',
 llega:{de:'Tu primo, en el grupo de la familia', nota:'Una captura del titular de la BBC', texto:'«La debacle de las elecciones de medio mandato debilita a Trump, pero por ahora aún conserva poder.»', extra:'mirad esto 👀'},
 original:['«La ',{k:'debacle',t:'debacle'},' de las elecciones de medio mandato ',{k:'debilita',t:'debilita a Trump'},', pero por ahora ',{k:'conserva',t:'aún conserva poder'},'.»'],
 fuenteOriginal:'captura · titular de la BBC',
 tramos:{
  debacle:{ver:'dicho',porque:'«Debacle» es la valoración del autor, no un dato.',fuente:'Anthony Zurcher, BBC'},
  debilita:{ver:'a medias',porque:'Es verdad que desde el 3 de enero el nuevo Congreso puede votar contra la guerra. «Debilita» ya es la valoración del autor.',fuente:'calendario del Congreso · Carnegie'},
  conserva:{ver:'es así',porque:'Conserva el veto: puede frenar lo que vote el Congreso.',fuente:'Constitución de EE. UU., art. I'}},
 inicio:'debilita',
 portada:{neutro:'Desde enero le pueden votar en contra. Pero conserva el **veto**.',complice:'Yo también pensé que ya no podía hacer nada. Le queda el **veto**.',seco:'Le pueden votar en contra. Conserva el **veto**.'},
 suceso:'¿Debilitado? A medias. ¿Atado de manos? No.',
 alsoSlide:{big:'El fin de la ayuda a Israel no lo propuso el nuevo Congreso. Lo anunció Trump.',sub:'El mismo día de las elecciones. Y el acuerdo de ayuda vigente llega hasta 2028.',fuente:'AP · Reuters'},
 enlace:'andalso.app/p/midterms-ormuz',
 orden:['also','relacion','antes','normal','dichos','ami','falta'], alias:{},
 contexto:'Titular de la BBC: «La debacle de las elecciones de medio mandato debilita a Trump, pero por ahora aún conserva poder». Contexto: guerra de EE. UU. e Israel con Irán, estrecho de Ormuz casi cerrado, rebaja del IVA de la energía en España.',
 N:{
  also:{q:'¿qué también es verdad?',titulo:'El fin de la ayuda a Israel lo anunció Trump',ver:'es así',fuente:'AP · Reuters',r:'Lo que el titular no cuenta: el fin de la ayuda a Israel lo anunció Trump el 3 de noviembre. No viene del nuevo Congreso.',items:[{t:'Lo anunció Trump, el 3 nov',ver:'es así',f:'AP · Reuters'}]},
  relacion:{q:'¿qué tiene que ver?',titulo:'De las urnas a tu factura: 4 eslabones',ver:'dicho',fuente:'el más débil, el plan del Congreso',r:'Te propongo cuatro eslabones. El del Congreso es un plan, no un hecho: va con raya discontinua.',items:[{t:'Midterms → nuevo Congreso, el 3 ene',ver:'es así',f:'calendario'},{t:'Nuevo Congreso → votar contra la guerra',ver:'dicho',f:'Schumer, Jeffries'},{t:'Guerra con Irán → Ormuz casi cerrado',ver:'es así',f:'prensa · Cortes Generales'},{t:'Ormuz → IVA de la energía al 10\u00a0%',ver:'es así',f:'BOE, marzo'}]},
  antes:{q:'¿qué pasó antes?',titulo:'28 feb, ataque a Irán. 2 mar, Ormuz cerrado',ver:'es así',fuente:'prensa',r:'Tres carriles en una línea de tiempo. Coincidir no es causar.',items:[{t:'28 feb · EE. UU. e Israel atacan Irán',ver:'es así',f:'prensa'},{t:'2 mar · Irán cierra Ormuz',ver:'es así',f:'prensa'},{t:'3 nov · midterms y anuncio sobre Israel',ver:'es así',f:'AP'}]},
  normal:{q:'¿es lo normal?',titulo:'Casi siempre pierde el partido del presidente',ver:'es así',fuente:'desde 1946',r:'Lo habitual: el partido del presidente pierde escaños en casi todas las elecciones de mitad de mandato desde 1946. Lo raro habría sido lo contrario.',items:[{t:'Pierde escaños el partido del presidente, casi siempre',ver:'es así',f:'elecciones desde 1946'},{t:'Las excepciones: 1998 y 2002',ver:'es así',f:'historial electoral'}]},
  dichos:{q:'¿qué dice cada uno?',titulo:'Trump, los demócratas e Irán',ver:'dicho',fuente:'una cita por bando',r:'Los motivos no se comprueban: se citan, uno por bando y con su nombre.',items:[{t:'Trump culpa en parte a la guerra',ver:'dicho',f:'CNBC'},{t:'Jeffries pide acabarla ya',ver:'dicho',f:'4 nov'},{t:'Irán: «dijeron no a la guerra»',ver:'dicho',f:'Ghalibaf'}]},
  ami:{q:'¿y a mí?',titulo:'IVA de luz, gas y gasolina: del 21 al 10\u00a0%',ver:'es así',fuente:'BOE, marzo',r:'Lo que ya llegó a España: la rebaja del IVA de la energía de marzo, por esta crisis.',items:[{t:'IVA de la energía: del 21 al 10\u00a0%',ver:'es así',f:'BOE, marzo'}]},
  falta:{q:'¿qué falta saber?',titulo:'Si el veto frenará una votación',ver:'sin fuente',fuente:'y más preguntas abiertas',r:'Lo que no se sabe no lo relleno: lo dejo como pregunta abierta, a la vista.',items:[{t:'Si el veto frenará una votación',ver:'sin fuente',f:'abierta'},{t:'Si Ormuz reabre y cuándo',ver:'sin fuente',f:'abierta'}]}
 }},
golpes:{
 id:'golpes', titulo:'Cinco golpes', elige:'Un post reenviado: «cinco golpes en seis días».',
 llega:{de:'Un amigo, en el grupo de la uni', nota:'Un texto reenviado muchas veces', texto:'«Microsoft se cayó. Los vuelos en EE. UU. pararon. Chase se cayó. Nvidia cayó. La NSA cayó. Las casualidades no existen.»', extra:'esto no es normal'},
 original:['«',{k:'microsoft',t:'Microsoft se cayó.'},' ',{k:'vuelos',t:'Los vuelos en EE. UU. pararon.'},' ',{k:'chase',t:'Chase se cayó.'},' ',{k:'nvidia',t:'Nvidia cayó.'},' ',{k:'nsa',t:'La NSA cayó.'},' ',{k:'casualidades',t:'Las casualidades no existen.'},'»'],
 fuenteOriginal:'texto reenviado',
 tramos:{
  microsoft:{ver:'es así',porque:'Microsoft tuvo una caída el 12 y el 13 de noviembre: un fallo de software que llevaba latente desde julio.',fuente:'Microsoft · TechRepublic'},
  vuelos:{ver:'es así',porque:'Hubo una parada de vuelos en EE. UU. el 13 de noviembre por un fallo de telecomunicaciones, todavía en investigación.',fuente:'FAA · AP'},
  chase:{ver:'a medias',porque:'Fue lentitud en el servicio, no una caída.',fuente:'BleepingComputer'},
  nvidia:{ver:'no es así',porque:'Nvidia no cayó: lo que hubo fue la dimisión de Huang.',fuente:'Reuters'},
  nsa:{ver:'sin fuente',porque:'Nadie lo confirma ni lo niega. No lo doy por bueno ni por falso.',fuente:'ninguna'},
  casualidades:{ver:'dicho',porque:'Es una opinión del autor, no un dato.',fuente:'el autor del post'}},
 inicio:'chase',
 portada:{neutro:'Cinco golpes, tres averías **distintas**. Y cortes así hay cada semana.',complice:'Yo también lo pensé al verlas juntas. Pero son tres averías **distintas**.',seco:'Tres averías **distintas**. Pasa cada semana.'},
 suceso:'¿Un patrón? No. Tres averías distintas.',
 alsoSlide:{big:'Cada semana hay entre 199 y 364 cortes de red en el mundo.',sub:'Lo raro sería una semana sin caídas. Y en ninguna de estas tres hay indicios de ciberataque.',fuente:'ThousandEyes, semana a semana, dic 2025 – ene 2026'},
 enlace:'andalso.app/p/cinco-golpes',
 orden:['also','relacion','antes','dichos','ami','falta'], alias:{normal:'also'},
 contexto:'Post reenviado: «Microsoft se cayó. Los vuelos en EE. UU. pararon. Chase se cayó. Nvidia cayó. La NSA cayó. Las casualidades no existen.» Sugiere que cinco fallos en seis días son un patrón.',
 N:{
  also:{q:'¿qué también es verdad?',titulo:'Hay entre 199 y 364 cortes de red cada semana',ver:'es así',fuente:'ThousandEyes',r:'Lo que el post no cuenta: cortes de red hay cada semana, entre 199 y 364 en todo el mundo. Lo raro sería una semana sin caídas.',items:[{t:'Entre 199 y 364 cortes por semana',ver:'es así',f:'ThousandEyes, dic 2025 – ene 2026'},{t:'En ninguna de las tres, indicios de ciberataque',ver:'es así',f:'las empresas · FAA'}]},
  relacion:{q:'¿qué tiene que ver?',titulo:'Nada que las una: dos de software y una de telecomunicaciones',ver:'es así',fuente:'empresas y causas distintas',r:'Las he puesto una al lado de otra: empresas distintas y causas distintas. No encuentro un eslabón que las una, y no me lo invento.',items:[{t:'Microsoft · software, fallo latente desde julio',ver:'es así',f:'Microsoft'},{t:'Vuelos · telecomunicaciones, en investigación',ver:'es así',f:'FAA'},{t:'Chase · software, lentitud',ver:'es así',f:'Chase'}]},
  antes:{q:'¿qué pasó antes?',titulo:'Del 12 al 17 de noviembre, cada una por su lado',ver:'es así',fuente:'prensa',r:'En una línea de tiempo se ve: cada avería en su día, sin solaparse en causa.',items:[{t:'12–13 nov · Microsoft',ver:'es así',f:'Microsoft'},{t:'13 nov · vuelos en EE. UU.',ver:'es así',f:'FAA'},{t:'16 nov · Chase',ver:'es así',f:'prensa'}]},
  dichos:{q:'¿qué dice cada uno?',titulo:'Cada partido culpa al otro del control aéreo',ver:'dicho',fuente:'prensa de EE. UU.',r:'Sobre quién debía modernizar el control aéreo hay acusaciones cruzadas. Son dichos, no hechos.',items:[{t:'Unos culpan a la administración anterior',ver:'dicho',f:'prensa de EE. UU.'},{t:'Otros, a los recortes de la actual',ver:'dicho',f:'prensa de EE. UU.'}]},
  ami:{q:'¿y a mí?',titulo:'No encuentro efecto en España',ver:'sin fuente',fuente:'lo digo en vez de inventarlo',r:'No he encontrado nada que te afecte aquí. Prefiero decírtelo a rellenar el hueco.',items:[{t:'Ningún efecto comprobado en España',ver:'sin fuente',f:'búsqueda sin resultados'}]},
  falta:{q:'¿qué falta saber?',titulo:'La causa exacta de lo de los vuelos',ver:'sin fuente',fuente:'en investigación',r:'Lo de los vuelos sigue en investigación. Por eso la portada no dice que cada una tenga su causa: lo dice cuando se sepa.',items:[{t:'La causa exacta de lo de los vuelos',ver:'sin fuente',f:'en investigación'}]}
 }}
};
})();
