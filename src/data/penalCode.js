// ============================================================
//  CODE PÉNAL — Comté de Lemoyne — Anno Domini 1905
//  Pour ajouter/modifier un article : éditez ce fichier.
//  Structure d'un article :
//    num    : identifiant (ex: "Art.03")
//    nom    : intitulé
//    desc   : description de l'infraction
//    peine  : peine affichée dans le code pénal
//    amende : montant en $ (0 si pas d'amende fixe)
//    sisika : true si peine de Sisika
// ============================================================

export const PENAL_CODE = [
  {
    titre: "TITRE I — Dispositions Générales",
    articles: [
      { num: "Art.01", nom: "Objet du code pénal", desc: "Définir les infractions pénales et peines dans le comté de Lemoyne en 1905.", peine: "Référence", amende: 0, sisika: false },
    ],
  },
  {
    titre: "TITRE II — Atteintes à l'Autorité Publique",
    articles: [
      { num: "Art.03",  nom: "Attroupement",                    desc: "Rassemblement susceptible de troubler l'ordre public après sommation.",                                     peine: "Max 25 $",             amende: 25,  sisika: false },
      { num: "Art.03b", nom: "Attroupement aggravé",            desc: "Incitation à l'émeute ou refus de dispersion après sommations réitérées.",                                  peine: "Max 50 $",             amende: 50,  sisika: false },
      { num: "Art.04",  nom: "Fausse alerte",                   desc: "Alerter les forces de l'ordre pour un fait inexact ou différent.",                                          peine: "Max 75 $",             amende: 75,  sisika: false },
      { num: "Art.05",  nom: "Refus d'identification",          desc: "Refuser de décliner son identité ou fournir de fausses informations.",                                      peine: "Max 50 $",             amende: 50,  sisika: false },
      { num: "Art.06",  nom: "Parjure",                         desc: "Faux témoignage sous serment dans une procédure judiciaire.",                                               peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.07",  nom: "Évasion",                         desc: "Se soustraire à la garde légale.",                                                                          peine: "Sisika + Max 150 $",   amende: 150, sisika: true  },
      { num: "Art.07b", nom: "Évasion aggravée",                desc: "Évasion par corruption d'agent ou usage de violence.",                                                      peine: "Double peine + 300 $", amende: 300, sisika: true  },
      { num: "Art.08",  nom: "Trouble à l'ordre public",        desc: "Créer une situation dangereuse ou intimidante en lieu public.",                                             peine: "Max 25 $",             amende: 25,  sisika: false },
      { num: "Art.08b", nom: "Trouble à l'ordre public aggravé",desc: "Trouble commis en réunion.",                                                                               peine: "Max 50 $",             amende: 50,  sisika: false },
      { num: "Art.09",  nom: "Abus de pouvoir",                 desc: "Utiliser de manière excessive un pouvoir conféré par un statut.",                                          peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.09b", nom: "Abus de pouvoir aggravé",         desc: "Abus discriminatoire, avec violence ou altérant la justice.",                                              peine: "Sisika + 300 $",       amende: 300, sisika: true  },
      { num: "Art.10",  nom: "Falsification",                   desc: "Altérer frauduleusement la vérité par écrit pour obtenir un droit non possédé.",                          peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.11",  nom: "Délit de fuite",                  desc: "Ne pas s'arrêter après avoir causé un tort mettant la vie en danger.",                                     peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.12",  nom: "Refus d'obtempérer",              desc: "Refuser d'obéir à une sommation légale d'un agent public.",                                               peine: "Max 100 $",            amende: 100, sisika: false },
      { num: "Art.13",  nom: "Corruption",                      desc: "Solliciter un bien ou service pour détourner un processus judiciaire.",                                    peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.13b", nom: "Corruption aggravée",             desc: "Agent public accordant sa complaisance en échange d'un bien ou service.",                                  peine: "Sisika + 300 $",       amende: 300, sisika: true  },
      { num: "Art.14",  nom: "Non-respect décision de justice", desc: "Désobéir volontairement à l'ordre d'une autorité judiciaire.",                                             peine: "Double sanction prononcée", amende: 0, sisika: false },
      { num: "Art.15",  nom: "Intimidation de témoin",          desc: "Empêcher ou inciter un témoin à renoncer à son témoignage.",                                               peine: "Max 75 $",             amende: 75,  sisika: false },
    ],
  },
  {
    titre: "TITRE III — Atteintes aux Personnes",
    articles: [
      { num: "Art.16",  nom: "Homicide involontaire",               desc: "Causer la mort d'autrui par maladresse, imprudence ou négligence.",                                  peine: "Sisika + Max 150 $",   amende: 150, sisika: true  },
      { num: "Art.17",  nom: "Homicide volontaire",                 desc: "Ôter délibérément la vie d'un être humain.",                                                          peine: "Sisika + Max 150 $",   amende: 150, sisika: true  },
      { num: "Art.17b", nom: "Homicide volontaire aggravé",         desc: "Homicide d'un agent public, en réunion, ou circonstances atroces.",                                   peine: "Sisika + Max 500 $",   amende: 500, sisika: true  },
      { num: "Art.18",  nom: "Tentative d'homicide volontaire",     desc: "Tenter d'ôter délibérément la vie d'un être humain.",                                                 peine: "Sisika + Max 100 $",   amende: 100, sisika: true  },
      { num: "Art.18b", nom: "Tentative d'homicide aggravée",       desc: "Tentative sur agent public, en réunion ou circonstances atroces.",                                    peine: "Sisika + Max 200 $",   amende: 200, sisika: true  },
      { num: "Art.19",  nom: "Non-assistance à personne en danger", desc: "Omettre de porter secours ou empêcher autrui de le faire.",                                           peine: "Max 75 $",             amende: 75,  sisika: false },
      { num: "Art.20",  nom: "Mise en péril d'autrui",              desc: "Exposer directement autrui à un risque immédiat de mort ou blessure.",                                peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.20b", nom: "Mise en péril aggravée",              desc: "Mettre en péril une personne accomplissant une mission publique.",                                     peine: "Max 300 $",            amende: 300, sisika: false },
      { num: "Art.21",  nom: "Violences",                           desc: "Atteindre physiquement autrui pour intimider, blesser ou faire souffrir.",                            peine: "Max 10 $",             amende: 10,  sisika: false },
      { num: "Art.21b", nom: "Violences aggravées",                 desc: "Violences commises avec une arme et/ou en réunion.",                                                  peine: "Max 75 $",             amende: 75,  sisika: false },
      { num: "Art.22",  nom: "Séquestration",                       desc: "Retenir une personne enfermée contre son gré par violence, ruse ou menace.",                          peine: "Max 150 $",            amende: 150, sisika: false },
      { num: "Art.22b", nom: "Séquestration aggravée",              desc: "Séquestration dans des conditions particulièrement atroces.",                                         peine: "Sisika + Max 300 $",   amende: 300, sisika: true  },
      { num: "Art.23",  nom: "Diffamation",                         desc: "Déclaration fausse portant atteinte à l'image d'autrui ou de ses biens.",                             peine: "Max 50 $",             amende: 50,  sisika: false },
      { num: "Art.24",  nom: "Harcèlement",                         desc: "Répétition de propos ou comportements dégradant les conditions de vie.",                              peine: "Max 50 $",             amende: 50,  sisika: false },
      { num: "Art.24b", nom: "Harcèlement aggravé",                 desc: "Harcèlement commis en réunion.",                                                                      peine: "Max 75 $",             amende: 75,  sisika: false },
      { num: "Art.25",  nom: "Menaces",                             desc: "Comportements laissant présager une nuisance à autrui.",                                               peine: "Max 25 $",             amende: 25,  sisika: false },
      { num: "Art.25b", nom: "Menaces aggravées",                   desc: "Menacer et contraindre autrui d'agir contre son gré.",                                                peine: "Max 75 $",             amende: 75,  sisika: false },
      { num: "Art.26",  nom: "Complot/Conspiration",                desc: "Accord avec une ou plusieurs personnes pour commettre un crime.",                                     peine: "Sisika + Max 300 $",   amende: 300, sisika: true  },
      { num: "Art.27",  nom: "Atteinte à la libre circulation",     desc: "Cheval ou charrette bloquant la circulation en ville.",                                               peine: "Max 10 $",             amende: 10,  sisika: false },
      { num: "Art.28",  nom: "Galop en ville",                      desc: "Galoper en ville à cheval ou aux rênes d'une charrette.",                                             peine: "Max 10 $",             amende: 10,  sisika: false },
      { num: "Art.29",  nom: "Atteinte à la pudeur",               desc: "Porter une tenue inappropriée en ville (torse nu, sans chemise).",                                     peine: "Max 10 $",             amende: 10,  sisika: false },
    ],
  },
  {
    titre: "TITRE IV — Atteintes aux Biens",
    articles: [
      { num: "Art.30",  nom: "Tentative de vol",            desc: "Tenter la soustraction frauduleuse d'un bien appartenant à autrui.",                             peine: "Max 75 $",                  amende: 75,  sisika: false },
      { num: "Art.31",  nom: "Vol",                         desc: "Prendre possession des biens d'un autre contre sa volonté (valeur < 100 $).",                   peine: "Max 150 $ + valeur des biens", amende: 150, sisika: false },
      { num: "Art.31b", nom: "Vol aggravé (avec arme)",     desc: "Vol commis avec usage d'une arme.",                                                              peine: "Max 200 $ + valeur des biens", amende: 200, sisika: false },
      { num: "Art.32",  nom: "Vol de cheval/charrette",     desc: "Voler ou s'installer illégalement sur un cheval ou charrette.",                                  peine: "Max 150 $",                 amende: 150, sisika: false },
      { num: "Art.33",  nom: "Extorsion",                   desc: "Obtenir par violence ou menace un engagement, bien ou secret.",                                  peine: "Max 75 $",                  amende: 75,  sisika: false },
      { num: "Art.34",  nom: "Abus de confiance",           desc: "Détourner des fonds ou biens remis dans le cadre d'une confiance.",                              peine: "Max 75 $",                  amende: 75,  sisika: false },
      { num: "Art.35",  nom: "Escroquerie",                 desc: "Tromper par faux nom ou manœuvres frauduleuses pour obtenir un bien.",                           peine: "Max 75 $",                  amende: 75,  sisika: false },
      { num: "Art.36",  nom: "Extorsion de fonds",          desc: "Abuser de sa qualité de fonctionnaire pour détourner des fonds.",                                peine: "Max 150 $",                 amende: 150, sisika: false },
      { num: "Art.36b", nom: "Extorsion de fonds aggravée", desc: "Extorsion de fonds avec falsification de documents.",                                            peine: "Max 300 $",                 amende: 300, sisika: false },
      { num: "Art.37",  nom: "Vandalisme",                  desc: "Atteindre volontairement un bien public ou privé en le dégradant.",                              peine: "Max 25 $",                  amende: 25,  sisika: false },
      { num: "Art.38",  nom: "Intrusion",                   desc: "Pénétrer dans un espace où l'accès est légitimement refusé.",                                    peine: "Max 25 $",                  amende: 25,  sisika: false },
      { num: "Art.38b", nom: "Intrusion aggravée",          desc: "Intrusion par violence ou dans une propriété gouvernementale.",                                   peine: "Max 75 $",                  amende: 75,  sisika: false },
    ],
  },
  {
    titre: "TITRE V — Drogues et Crimes Capitaux",
    articles: [
      { num: "Art.39", nom: "Tentative d'homicide en représailles", desc: "Tenter d'ôter la vie en représailles d'une décision de justice.",       peine: "Sisika + Max 500 $",    amende: 500, sisika: true  },
      { num: "Art.40", nom: "Atteinte à la Nation",                 desc: "Atteindre l'intégrité nationale ou ses institutions par la terreur.",   peine: "Sisika à vie + 250 $",  amende: 250, sisika: true  },
      { num: "Art.41", nom: "Sédition",                             desc: "S'insurger contre le pouvoir établi, instiguer à l'émeute.",            peine: "Sisika à vie + 500 $",  amende: 500, sisika: true  },
      { num: "Art.42", nom: "Séparatisme",                          desc: "Sédition commise par un agent public.",                                 peine: "Sisika à vie + 500 $",  amende: 500, sisika: true  },
      { num: "Art.43", nom: "Collusion criminelle",                 desc: "Agir en réunion pour faciliter la commission d'un méfait.",             peine: "Max 50 $",              amende: 50,  sisika: false },
      { num: "Art.44", nom: "Détention illégale de drogues",        desc: "Détenir des drogues sur soi, dans son véhicule ou sa propriété.",       peine: "1$/produit, max 50 $ + saisie", amende: 50, sisika: false },
      { num: "Art.45", nom: "Trafic illégal de drogues",            desc: "Possession > 5 unités ou vente/échange de drogues sans autorisation.", peine: "Max 75 $",              amende: 75,  sisika: false },
      { num: "Art.46", nom: "Fabrication illégale de drogues",      desc: "Cultiver, fabriquer ou concevoir des drogues sans autorisation.",       peine: "Max 150 $",             amende: 150, sisika: false },
      { num: "Art.47", nom: "Pratique sodomite",                    desc: "Avoir des mœurs ou pratiques sodomites.",                               peine: "Sisika + Max 200 $",    amende: 200, sisika: true  },
      { num: "Art.48", nom: "Cannibalisme",                         desc: "Consommer volontairement de la chair humaine.",                         peine: "Peine de mort",         amende: 0,   sisika: true  },
    ],
  },
  {
    titre: "TITRE VI — Détention d'Armes",
    articles: [
      { num: "Art.51", nom: "Possession d'arme illégale ou explosifs", desc: "Posséder une arme à feu sans numéro de série ou des explosifs.", peine: "Max 75 $ + confiscation", amende: 75, sisika: false },
      { num: "Art.52", nom: "Utilisation non justifiée d'une arme",    desc: "Utiliser une arme sans motif valable ou justifiable.",            peine: "25 $ + confiscation",     amende: 25, sisika: false },
    ],
  },
  {
    titre: "TITRE VII — Ajouts / Divers",
    articles: [
      { num: "Art.53", nom: "Organisation jeu d'argent clandestin",   desc: "Organiser des jeux d'argent hors Casino ou sans autorisation.",                         peine: "Max 100 $",                        amende: 100, sisika: false },
      { num: "Art.54", nom: "Participation jeu d'argent clandestin",  desc: "Pratiquer les jeux d'argent hors Casino ou sans autorisation.",                         peine: "Max 25 $",                         amende: 25,  sisika: false },
      { num: "Art.55", nom: "Exhibition d'une arme à feu",            desc: "Manipuler une arme sur la voie publique ou en lieu privé ouvert au public.",            peine: "10 $",                             amende: 10,  sisika: false },
      { num: "Art.56", nom: "Blanchiment d'argent",                   desc: "Posséder, cacher ou transférer des fonds issus d'activités criminelles.",               peine: "Max 150 $",                        amende: 150, sisika: false },
      { num: "Art.57", nom: "Fraude fiscale",                         desc: "Omettre ou éviter intentionnellement de payer les taxes dues à l'État.",                peine: "Sisika + taxes + majoration 20%",  amende: 0,   sisika: true  },
    ],
  },
];

// Liste à plat des infractions verbalisables (amende > 0 ou sisika)
export const ALL_INFRACTIONS = PENAL_CODE.flatMap(s =>
  s.articles.filter(a => a.amende > 0 || a.sisika)
);
