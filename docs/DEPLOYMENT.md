# Déploiement sur Hostinger (VPS) — installation « one-command »

Ce guide déploie HomeQuest sur un **VPS Hostinger** avec Docker. Deux modes :

- **HTTP simple** — accès via `http://IP_DU_VPS:3000` (idéal réseau local / test).
- **HTTPS automatique** — via un nom de domaine, certificat TLS géré par Caddy.

> ⚠️ L'**hébergement mutualisé** Hostinger ne convient pas (pas de Docker ni de
> process Node persistant). Il faut un **plan VPS**.

---

## 1. Créer le VPS

Dans le hPanel Hostinger :

1. **VPS → Créer / Gérer**, choisis un plan (2 Go de RAM ou plus recommandé).
2. Système d'exploitation : **Ubuntu 24.04** (ou le template **Ubuntu + Docker**,
   qui pré-installe Docker — sinon le script s'en charge).
3. Définis un mot de passe root et note l'**adresse IP** du VPS.

## 2. Se connecter en SSH

```bash
ssh root@IP_DU_VPS
```

## 3. Installer en une commande

### Mode HTTP (le plus simple)

```bash
git clone https://github.com/chartie4r/HomeQuest.git /opt/homequest
sudo bash /opt/homequest/scripts/install.sh
```

À la fin, l'app répond sur **http://IP_DU_VPS:3000**.

### Mode HTTPS (avec un domaine)

Fais d'abord pointer ton domaine vers le VPS (voir §4), puis :

```bash
git clone https://github.com/chartie4r/HomeQuest.git /opt/homequest
sudo APP_DOMAIN=quest.mondomaine.com bash /opt/homequest/scripts/install.sh
```

Caddy obtient automatiquement un certificat Let's Encrypt ; l'app répond sur
**https://quest.mondomaine.com**.

Le script est **idempotent** : installe Docker si besoin, crée un swap si la RAM
est faible, génère un `.env` (avec un secret de session aléatoire), build et démarre
les conteneurs. Le relancer met simplement le code à jour et redéploie.

> **Dépôt privé ?** Passe une URL authentifiée au script :
> ```bash
> sudo REPO_URL=https://<TOKEN_GITHUB>@github.com/chartie4r/HomeQuest.git \
>   bash scripts/install.sh
> ```

## 4. DNS + ports (mode HTTPS)

1. Chez ton registrar (ou le DNS Hostinger), crée un enregistrement **A** :
   `quest.mondomaine.com → IP_DU_VPS`.
2. Ouvre les ports **80** et **443** (firewall Hostinger / hPanel → VPS → Firewall).
3. En mode HTTPS, pense à **fermer/filtrer le port 3000** depuis Internet (l'app
   reste accessible via Caddy).

## 5. Premier accès

- Un profil de démonstration existe : **« Démo » / NIP 1234**.
- Crée les profils de ta famille, puis **supprime le profil Démo**.

## 6. Mettre à jour

```bash
sudo bash /opt/homequest/scripts/install.sh
# (ajoute APP_DOMAIN=... si tu es en HTTPS)
```

Le script fait un `git pull`, reconstruit l'image et redémarre — la base est
préservée (volume Docker).

## 7. Sauvegarde & restauration

La base SQLite vit dans le volume Docker `homequest-data`.

```bash
# Sauvegarde
docker run --rm -v homequest_homequest-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/homequest-backup.tgz -C /data .

# Restauration
docker run --rm -v homequest_homequest-data:/data -v "$PWD":/backup alpine \
  sh -c 'cd /data && tar xzf /backup/homequest-backup.tgz'
```

> Le préfixe du volume (`homequest_`) suit le nom du dossier du projet
> (`/opt/homequest`). Vérifie avec `docker volume ls`.

## 8. Dépannage

```bash
cd /opt/homequest
docker compose ps                 # état des conteneurs
docker compose logs -f app        # logs de l'application
docker compose logs -f caddy      # logs du proxy / certificat (mode HTTPS)
```

- **Le build échoue / OOM** : VPS trop juste en RAM. Le script crée un swap ;
  sinon prends un plan avec plus de mémoire.
- **Certificat HTTPS non émis** : vérifie que le DNS pointe bien sur le VPS et que
  les ports 80/443 sont ouverts (Caddy a besoin du port 80 pour la validation).
- **Connexion impossible en HTTP** : normal si tu es passé en HTTPS (le cookie de
  session devient `Secure`). Utilise l'URL `https://`.

---

## Alternative : Docker Manager (hPanel)

Les VPS Hostinger proposent un **Docker Manager** dans le hPanel qui peut démarrer
un projet à partir d'un `docker-compose.yml`. Tu peux y importer ce dépôt et lancer
`docker-compose.yml` (mode HTTP) — il faudra définir `NUXT_SESSION_PASSWORD` dans
les variables d'environnement. La méthode SSH ci-dessus reste la plus simple et la
plus complète (HTTPS, mises à jour, swap).
