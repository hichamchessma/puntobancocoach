# Punto Banco Coach

Coach de mise **anti-tilt** et **simulateur** de Punto Banco (Baccarat), avec lecture
des tableaux à la chinoise (derived roads). Ce n'est **pas** un prédicteur magique :
le jeu reste ~50/50. La valeur de l'app, c'est la **discipline** — savoir quand miser,
quand attendre, et **ne jamais laisser les mises monter à l'infini**.

🔗 **Démo** : https://hichamchessma.github.io/puntobancocoach/ (après activation de Pages)

## Fonctionnalités

- **Simulateur** : vraies règles de tirage (3ᵉ carte), cartes distribuées une par une
  comme au casino. Vitesse réglable (instantané ou progressif), raccourci **Espace**
  (maintenir ≥ 1,5 s = distribution en continu).
- **Mode casino** : saisie manuelle des résultats d'une vraie table (P / B / T).
- **Scoreboard complet** : Big Road, Bead Plate, et les 3 derived roads
  (Big Eye Boy 大眼仔, Small Road 小路, Cockroach 曱甴路) avec code rouge/bleu.
- **Analyse "style chinois"** : régularité du sabot, motifs nommés (Dragon 長龍,
  Ping-pong 單跳, Double ping-pong 雙跳), côté qui prolonge la tendance.
- **Coach** : stratégie zigzag avec **progression bornée** (paliers plafonnés par la
  mise max et un % du stack → STOP/reset forcé, pas de martingale). Conseil détaillé
  via la touche **S**.

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:5173/
```

Autres scripts :

```bash
npm run build    # tsc + build de production dans dist/
npm run preview  # prévisualise le build
```

## Stack technique

- **Vite + React + TypeScript**
- Moteur de jeu **pur TS** dans `src/engine/` (cartes, patterns, derived roads, coach),
  séparé de l'UI (`src/components/`) et de l'état (`src/state/`).

## Déploiement automatique (CI/CD)

À chaque `git push` sur `main`, GitHub Actions build l'app et la déploie sur
GitHub Pages (voir `.github/workflows/deploy.yml`).

**Activation (une seule fois)** : sur GitHub → **Settings → Pages → Source : GitHub Actions**.

> ⚠️ Outil pédagogique et de simulation. Les jeux d'argent comportent un risque réel
> de perte. Aucune stratégie ne bat l'avantage de la maison sur le long terme.
