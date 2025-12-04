
# Protocoles d'analyse des données

Cet document décrit les protocoles standardisés pour la préparation, l'analyse et la documentation des jeux de données produits ou utilisés par le laboratoire Spatial Research Lab. L'objectif est d'assurer la reproductibilité, la traçabilité et la qualité des résultats.

## 1. Objectifs et champ d'application

- **Objectif :** fournir des étapes reproductibles et des bonnes pratiques pour transformer les données brutes en résultats analytiques prêts pour publication ou intégration dans les simulations.
- **Champ :** tous les jeux de données internes (mesures, sorties de simulation, exports expérimentaux) et les processus d'analyse réalisés au sein du dépôt.

## 2. Principes généraux

- Documenter chaque transformation de données (script + version). 
- Garder les étapes atomiques (prétraitement, nettoyage, analyse descriptive, modélisation). 
- Conserver une copie immuable des données d'origine (`data/sql` ou `data/exports`) et travailler sur des copies dérivées.
- Versionner les scripts et l'environnement d'exécution (ex. `requirements.txt`, `package.json`, `composer.lock`).

## 3. Formats et conventions

- Formats de stockage recommandés :
	- Table relationnelle (MySQL) pour les grands jeux structurés — voir `data/sql/database.sql`.
	- CSV UTF-8 pour échanges tabulaires.
	- JSON pour métadonnées et structures hiérarchiques (ex. `tests/fixtures/*.json`).
- Nommage des fichiers : `YYYYMMDD_source-description_version.ext` (ex. `20251130_experiment-tilt_v01.csv`).
- Horodatage : UTC dans toutes les colonnes `timestamp`.

## 4. Prétraitement (pipeline recommandé)

1. Inventaire et copie :
	 - Identifier le jeu de données source et créer une copie de travail dans `data/exports/working/`.
2. Validation des formats :
	 - Vérifier encodage UTF-8, délimiteurs, colonnes attendues.
	 - Utiliser `utils/DataValidator.php` ou scripts Python (`scripts/import-data.sh`) selon le cas.
3. Nettoyage :
	 - Supprimer colonnes vides, harmoniser noms de colonnes (snake_case), convertir types (dates → timestamp).
	 - Traiter valeurs manquantes : documenter la stratégie (suppression, imputation, marqueur spécial).
4. Contrôles qualité :
	 - Statistiques sommaires (count, mean, std, min, max) par colonne.
	 - Détection d'outliers (IQR ou Z-score) et log des suppressions/transformations.

Exemple minimal en Python (pandas) — enregistrer sous `scripts/analysis/clean_and_profile.py` :

```python
import pandas as pd

df = pd.read_csv('data/exports/working/dataset.csv')
report = df.describe(include='all')
report.to_csv('data/exports/working/dataset_profile.csv')
df.to_csv('data/exports/processed/dataset_clean.csv', index=False)
```

## 5. Analyses statistiques et modélisation

- Séparer clairement analyses exploratoires (EDA) et tests statistiques formels.
- Documenter hypothèses, tests statistiques et niveau de confiance (`alpha`) utilisés.
- Pour les modèles reproduisables :
	- Garder le code d'entraînement, l'artefact (pickle / joblib / model file) et les hyperparamètres.
	- Versionner l'entrée de test et les seeds aléatoires pour reproductibilité.

## 6. Visualisation et export

- Générer figures avec des scripts (pas d'export manuel sans script). 
- Stocker les figures dans `frontend/assets/images/models/` ou un dossier `reports/figures/` daté.
- Lors d'exports (CSV, JSON, NetCDF), mentionner la version du script et le hash du commit git.

## 7. Reproductibilité et environnement

- Inclure un fichier `environment` :
	- Python : `requirements.txt` ou `pyproject.toml`.
	- Node : `package.json` + `package-lock.json`.
	- PHP : `composer.json` + `composer.lock`.
- Fournir un `README` minimal par pipeline expliquant les commandes pour reproduire l'analyse.
- Pour analyses critiques : fournir un script `run_all.sh` qui exécute toutes les étapes (préparation → analyse → rapport).

Exemple de commandes pour reproduire un pipeline :

```bash
# préparer l'environnement Python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# lancer le pipeline
bash scripts/import-data.sh data/exports/source.csv
python scripts/analysis/clean_and_profile.py
python scripts/analysis/run_analysis.py
```

## 8. Tests et validation

- Ajouter tests unitaires pour fonctions critiques de transformation (voir `tests/unit/`).
- Exécuter tests d'intégration pour pipelines de bout en bout (voir `tests/integration/`).

## 9. Métadonnées et traçabilité

- Chaque dataset publié doit accompagner :
	- Description courte, auteur, date, méthode d'acquisition.
	- Version du script d'analyse, hash git et dépendances.
	- Licence et conditions d'usage.

## 10. Bonnes pratiques de collaboration

- Revues de code obligatoires pour modifications des scripts d'analyse.
- Ouvrir une issue/liée pour tout changement de protocole majeur et documenter la justification.

## Contacts et ressources

- Responsable des données : équipe Research (voir `backend/api/research-data.php`).
- Exemples de scripts et fixtures : `tests/fixtures/`.

---

Pour toute modification ou ajout à ce protocole, créez une PR décrivant les changements et les raisons scientifiques/techniques associées.


