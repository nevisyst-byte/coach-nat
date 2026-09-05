Toujours proposer une sortie : bouton de réinitialisation, ou ajout de l'élément manquant.

```jsx
<EmptyState
  title="Aucun nageur trouvé"
  hint="Essaie un autre nom, ou retire le filtre de groupe."
  action={<Button variant="secondary" onClick={reset}>Réinitialiser la recherche</Button>}
/>
```
