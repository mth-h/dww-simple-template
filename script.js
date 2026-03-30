/* =====================================================================
   DOCUMENTATION DE L'UTILISATION DE L'IA
   
   Outil utilisé : Claude (Anthropic) — claude.ai
   
   ── PROMPTS UTILISÉS ──────────────────────────────────────────────────
   
    Voici mon fichier HTML qui contient une grille .show-grid avec des cartes de spectacles codées en dur. 
    Je dois les générer dynamiquement depuis cette API JSON :https://makerslab.em-lyon.com/dww/data/shows.json

    La structure du JSON est :
    {
      "categories": ["musicals", "comedies", "plays"],
      "musicals": [ { "title": "...", "image": "...", "description": "...", "price": ..., "tickets_remaining": ... } ],
      ...
    }

    Écris le fichier script.js qui :
        1. Fetch le JSON depuis l'URL ci-dessus
        2. Vide la grille existante et génère les cartes dynamiquement
        3. Alterne la position de l'image (gauche/droite) entre chaque carte
        4. Applique des bordures séparatrices entre les cartes selon leur position dans la grille 2 colonnes
        5. Utilise une couleur de titre différente par catégorie (classes CSS : title-blue, title-burgundy, title-gold)

        Ajoute des commentaires pour expliquer le code.
   
   ── ERREURS DU CHATBOT ────────────────────────
   
   1. COMPTAGE DES CARTES DANS createCard()
      Le code demande à la page combien de cartes il y avait déjà pour 
      savoir si l'image doit aller à gauche ou à droite. 
      Si une carte existe déjà dans le HTML avant que le script tourne, 
      la numérotation est faussée et l'alternance partait de travers.
   
   2. GESTION D'ERREUR INCOMPLÈTE
      Si l'API plante (pas de connexion, serveur en panne…), 
      l'erreur est seulement écrite dans la console développeur
      un endroit que l'utilisateur normal ne verra jamais

   4. ATTRIBUT alt DE L'IMAGE
      Le texte descriptif de l'image (alt) est construit comme show.title + " poster". 
      Si le JSON ne contient pas de titre, le résultat est "undefined poster",
      ce qui est inutile pour un visiteur du site.
   ===================================================================== */


/* =====================================================================
   LONDON THEATRE — Grille de spectacles dynamique
   
   Objectif : Récupère les données depuis une API JSON distante et
   génère dynamiquement les cartes de spectacles dans le conteneur
   .show-grid de la page.
   
   Ce script remplace tout contenu HTML codé en dur par des cartes
   construites entièrement en JavaScript, rendant la page pilotée
   par les données.
   ===================================================================== */


/* -----------------------------------------------------------------------
   CORRESPONDANCE CATÉGORIE → COULEUR
   
   Associe chaque nom de catégorie (tel qu'il apparaît dans le JSON)
   à une classe CSS qui contrôle la couleur du titre du spectacle.
   
   Utiliser un objet comme table de correspondance est plus propre
   qu'une série de if/else — on fait simplement categoryColors[category]
   pour obtenir la bonne classe en O(1).
   ----------------------------------------------------------------------- */
const categoryColors = {
    musicals: "title-blue",
    comedies: "title-burgundy",
    plays: "title-gold"
};


/* -----------------------------------------------------------------------
   RÉCUPÉRATION DES DONNÉES — Fetch API (basée sur les Promises)
   
   On utilise la fonction native fetch() pour envoyer une requête HTTP GET
   vers le fichier JSON distant. fetch() retourne une Promise, donc on
   chaîne des appels .then() pour traiter la réponse de façon asynchrone
   sans bloquer la page.
   
   Étape 1 — .then(response => response.json())
     Le premier .then() reçoit l'objet Response HTTP brut.
     Appeler .json() dessus parse le corps de la réponse en JSON et
     retourne une nouvelle Promise qui se résout en objet JavaScript.
   
   Étape 2 — .then(data => displayShows(data))
     Une fois le JSON entièrement parsé, on passe l'objet résultant
     à notre fonction displayShows() qui gère tout le rendu dans le DOM.
   
   .catch() — Gestion des erreurs
     Si quelque chose tourne mal (panne réseau, JSON malformé, etc.),
     l'erreur est interceptée ici et affichée dans la console pour
     ne pas échouer silencieusement.
   ----------------------------------------------------------------------- */
fetch("https://makerslab.em-lyon.com/dww/data/shows.json")
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        displayShows(data);
    })
    .catch(function (error) {
        console.error("Erreur lors du chargement des spectacles :", error);
    });


/* -----------------------------------------------------------------------
   displayShows(data)
   
   Reçoit l'objet JSON parsé et orchestre le rendu de toutes les cartes
   de spectacles dans la grille.
   
   Structure JSON attendue :
   {
     "categories": ["musicals", "comedies", "plays"],
     "musicals": [ { title, image, description, price, tickets_remaining }, ... ],
     "comedies": [ ... ],
     "plays":    [ ... ]
   }
   
   Stratégie :
   - Vider la grille pour supprimer tout contenu placeholder ou codé en dur.
   - Itérer sur les catégories, puis sur les spectacles de chaque catégorie.
   - Collecter toutes les cartes créées dans un tableau pour pouvoir
     appliquer des classes de bordure selon la position de chaque carte
     dans la grille à 2 colonnes (ce que le CSS seul ne gère pas facilement
     sans astuces :nth-child).
   ----------------------------------------------------------------------- */
function displayShows(data) {

    // Sélectionne le conteneur de la grille — toutes les cartes y seront injectées
    const grid = document.querySelector(".show-grid");

    // Efface le contenu existant (ex : cartes statiques placées dans le HTML)
    grid.innerHTML = "";

    // Conserve une référence à chaque carte pour leur assigner des
    // classes de bordure par index, une fois toutes les cartes créées
    let allCards = [];

    // Boucle externe : itère sur chaque catégorie dans l'ordre défini
    // par le tableau "categories" du JSON (préserve l'ordre d'affichage voulu)
    data.categories.forEach(function (category) {

        // Récupère le tableau d'objets spectacles pour cette catégorie
        const shows = data[category];

        // Boucle interne : crée une carte par spectacle et l'ajoute à la grille
        shows.forEach(function (show) {
            const card = createCard(show, category);
            allCards.push(card);       // conserve la référence pour la logique de bordure
            grid.appendChild(card);    // ajoute la carte au DOM en direct
        });
    });

    /* -------------------------------------------------------------------
       LOGIQUE DES BORDURES — Simuler des séparateurs de grille sans doublon
       
       La grille utilise une mise en page à 2 colonnes. Pour créer des
       lignes de séparation entre les cartes sans doubler les bordures,
       on applique :
       
       - "card-border-top"  → toute carte qui n'est PAS dans la première
                              ligne (index >= 2)
       - "card-border-left" → toute carte dans la colonne de droite
                              (index impair : 1, 3, 5, …)
       
       Ainsi, les bordures sont tracées uniquement sur les bords intérieurs,
       ce qui évite l'effet de double bordure entre cartes adjacentes.
       ------------------------------------------------------------------- */
    allCards.forEach(function (card, index) {

        // Les cartes à partir de la deuxième ligne reçoivent un séparateur en haut
        if (index >= 2) {
            card.classList.add("card-border-top");
        }

        // Les cartes en colonne de droite (positions impaires) reçoivent un séparateur à gauche
        if (index % 2 !== 0) {
            card.classList.add("card-border-left");
        }
    });
}


/* -----------------------------------------------------------------------
   createCard(show, category)
   
   Construit et retourne un élément <article> représentant un spectacle.
   
   Paramètres :
   - show     : objet avec title, image, description, price,
                tickets_remaining
   - category : clé de chaîne utilisée pour récupérer la classe CSS
                de couleur du titre
   
   Décision de mise en page — alternance de la position de l'image :
   On compte le nombre d'éléments .show-card déjà présents dans le DOM
   au moment où cette fonction est appelée. Si ce nombre est impair,
   l'image se place à droite ; sinon à gauche. Cela crée une alternance
   visuelle sur l'ensemble de la grille.
   
   Remarque : on compte les cartes depuis le DOM (pas depuis une variable
   locale) car cette fonction est appelée carte par carte, et chaque appel
   précédent a déjà ajouté sa carte au DOM avant le suivant.
   ----------------------------------------------------------------------- */
function createCard(show, category) {

    // Compte les cartes déjà dans le DOM pour déterminer la position de l'image
    const cardIndex = document.querySelectorAll(".show-card").length;

    // Si l'index est impair → image à droite de la carte
    const imageRight = cardIndex % 2 !== 0;

    /* ------------------------------------------------------------------
       Construction de l'élément <article> — conteneur principal de la carte
       Classes CSS :
       - "show-card"         → styles de base partagés par toutes les cartes
       - "card-image-right"  → variante flexbox : image après le texte dans le DOM
       - "card-image-left"   → variante flexbox : image avant le texte dans le DOM
       ------------------------------------------------------------------ */
    const article = document.createElement("article");
    article.classList.add("show-card");
    article.classList.add(imageRight ? "card-image-right" : "card-image-left");

    /* ------------------------------------------------------------------
       Construction du poster <img>
       - src  : URL issue du JSON (pointe vers l'affiche du spectacle)
       - alt  : texte descriptif pour l'accessibilité / les lecteurs d'écran
       ------------------------------------------------------------------ */
    const img = document.createElement("img");
    img.src = show.image;
    img.alt = show.title + " poster";
    img.classList.add("show-poster");

    /* ------------------------------------------------------------------
       Construction du bloc texte <div>
       Contient toutes les informations textuelles sur le spectacle.
       ------------------------------------------------------------------ */
    const info = document.createElement("div");
    info.classList.add("show-info");

    // Titre du spectacle <h2> — la classe de couleur vient de la table categoryColors
    const title = document.createElement("h2");
    title.classList.add("show-title");
    title.classList.add(categoryColors[category]); // ex : "title-blue"
    title.textContent = show.title;

    // Label de catégorie <p> — affiché en majuscules pour l'accentuation visuelle
    const cat = document.createElement("p");
    cat.classList.add("show-category");
    cat.textContent = category.toUpperCase(); // ex : "MUSICALS"

    // Description <p> — courte accroche issue du JSON
    const desc = document.createElement("p");
    desc.classList.add("show-desc");
    desc.textContent = show.description;

    // Prix et disponibilité des billets <p>
    // On concatène le prix (précédé de £) et le nombre de billets restants
    // en une seule ligne lisible plutôt que de créer deux éléments séparés
    const details = document.createElement("p");
    details.classList.add("show-desc");
    details.textContent = "From £" + show.price + " — " + show.tickets_remaining + " tickets remaining";

    // Assemblage du bloc info (ordre : titre → catégorie → description → détails)
    info.appendChild(title);
    info.appendChild(cat);
    info.appendChild(desc);
    info.appendChild(details);

    /* ------------------------------------------------------------------
       Assemblage de la carte — l'ordre des enfants dépend de la position
       de l'image.
       
       Quand imageRight est true  : [bloc info] [image]
       Quand imageRight est false : [image] [bloc info]
       
       La mise en page CSS flexbox les positionne ensuite côte à côte.
       ------------------------------------------------------------------ */
    if (imageRight) {
        article.appendChild(info);
        article.appendChild(img);
    } else {
        article.appendChild(img);
        article.appendChild(info);
    }

    // Retourne la carte entièrement assemblée pour être ajoutée à la grille
    return article;
}