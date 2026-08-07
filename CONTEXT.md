# HomeQuest

Application familiale de quêtes/tâches gamifiées, pensée pour la tablette partagée du
foyer. Un déploiement = un foyer, donc aucune notion de tenant.

Ce fichier est un **glossaire**, rien d'autre : il fixe les mots, jamais les colonnes.
Le modèle de données vit dans [`docs/modele-definition.md`](./docs/modele-definition.md).

## Règles d'écriture

**L'interface est en français, les identifiants sont en anglais.** Les tables sont au
pluriel (`users`, `routines`, `tasks`).

**« Tâche » ne s'emploie jamais nu** — voir l'entrée ci-dessous.

**On écrit toujours « XP »**, jamais « points d'expérience » ni « points XP ». C'est ce
qui garde « point » sans ambiguïté.

## Langue

### Ce qu'il y a à faire

**Définition** :
Le modèle d'une chose à faire, tel qu'un adulte l'a écrit. Elle ne se complète pas
elle-même : elle décrit ce qui est à faire et ce que ça paie.
_Éviter_ : modèle, gabarit, template

**Tâche** :
Une chose à faire par un membre, qui paie des XP et des points et passe par la
validation d'un adulte. **Ne jamais employer le mot seul** : dire **tâche de routine**
ou **tâche du tableau**. Le mot désigne sinon deux étendues différentes — toutes les
tâches, ou seulement celles du tableau.
_Éviter_ : corvée, quête, mission, activité

**Tâche de routine** :
Une tâche qui appartient à une routine. Elle n'est pas réclamable, n'apparaît pas sur le
tableau, et n'existe qu'à l'intérieur de sa routine.

**Tâche du tableau** :
Une tâche qui n'appartient à aucune routine. Elle est ouverte à tous — premier arrivé,
premier payé — et n'appartient à personne tant que personne ne l'a prise.
_Éviter_ : corvée

**Routine** :
Un groupe ordonné de tâches appartenant à un seul membre, qui revient selon une cadence.
Elle ne paie rien et ne se complète pas directement : elle est réputée faite quand ses
tâches le sont. Son **titre** porte aussi le moment de la journée — « Avant l'école »,
« Le matin ».
_Éviter_ : habitude, rituel, groupe

**Étape** :
Une ligne de texte cochable à l'intérieur d'une tâche, un simple aide-mémoire. Une étape
n'a ni récompense, ni validation, ni complétion propre — et les coches sont éphémères.
C'est ce qui la distingue d'une tâche de routine.
_Éviter_ : sous-tâche, item, checklist

**Objectif** :
Une cible chiffrée optionnelle posée sur une tâche — « 9 / 14 jours ». Compte toujours
des **complétions**, jamais l'objet de la tâche : aucun compteur de pages n'existe.
_Éviter_ : cible, but, challenge

### Le temps

**Cadence** :
La règle qui dit à quelle fréquence une routine revient : quotidienne, hebdomadaire,
mensuelle ou annuelle. Seule une routine en porte une ; une tâche hérite de la sienne.
_Éviter_ : récurrence *(en français — `recurrence` reste l'identifiant en code)*, fréquence, répétition

**Ancre** :
La date civile qui donne à la fois la **phase** d'une cadence — quel jour de semaine,
quel quantième — et le **premier jour** où la routine existe.
_Éviter_ : date de début, point de départ

**Rabattement** :
La règle qui fait sortir une routine mensuelle ancrée un 31 le dernier jour des mois plus
courts — le 28 en février, le 30 en avril. Elle ne saute jamais un mois.

**Fuseau du foyer** :
Le fuseau horaire unique de l'instance, qui décide où commence la journée. Ce n'est pas
un attribut d'un membre : un foyer, un fuseau.

### Les états d'une définition

**Archivée** :
Retirée de la circulation sans être supprimée. Rien n'est jamais supprimé pour de bon.
Une routine **expirée** est simplement une routine archivée — il n'existe pas de fin
programmée.
_Éviter_ : supprimée, désactivée, expirée

**Active** :
Non archivée. Une tâche de routine n'est active que si elle-même **et** sa routine le
sont.

**Ponctuelle** :
Une tâche du tableau qui quitte le tableau une fois faite. Par défaut une tâche du
tableau est une **offre permanente**, réclamable et payée autant de fois qu'elle se
présente.
_Éviter_ : unique, one-shot, non répétitive

### Les gens et ce qu'ils gagnent

**Membre** :
Une personne du foyer, adulte ou enfant. Chacun a un profil et un NIP.
_Éviter_ : utilisateur, compte, profil

**Propriétaire** :
Le membre à qui une routine appartient. C'est le **seul** mécanisme nominatif : une
tâche ne désigne jamais personne. Une routine par membre, même quand deux routines se
ressemblent.
_Éviter_ : assigné, responsable

**Auteur** :
Le membre qui a écrit une tâche du tableau. Distinct du propriétaire — qui l'a écrite
n'est pas à qui elle est.
_Éviter_ : créateur

**XP** :
La monnaie de progression : elle fait monter de niveau et fait grandir la ville. Elle ne
se dépense pas. Toujours écrite « XP ».
_Éviter_ : points d'expérience, points XP, expérience

**Point** :
La monnaie dépensable à la boutique. Indépendante des XP — ni l'une ni l'autre n'est
dérivée de la sienne. Une tâche de routine en paie comme une tâche du tableau.
_Éviter_ : pièce, jeton, crédit

**Récompense** :
Ce qu'une tâche paie : ses XP et ses points. À ne pas confondre avec le **prix** d'un
objectif, qui est du texte libre, ni avec un article de la boutique.
