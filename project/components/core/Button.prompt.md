Bouton d'action : un seul `primary` par écran, tout le reste en `secondary` / `ghost`.

```jsx
<Button variant="primary" onClick={planifier}>Planifier la séance</Button>
<Button variant="ghost" size="s">Fiche</Button>
<Button variant="dashed" icon="＋" block>Créer un stage</Button>
```

- `quiet` sert aux actions contextuelles bleutées dans une carte (« Gérer les absences »).
- `danger` est réservé à la saisie de notation et aux suppressions, jamais à un enregistrement neutre.
- Sur mobile, utiliser `size="l"` (46 px) ou `size="m"` : jamais moins de 44 px de hauteur tactile.
