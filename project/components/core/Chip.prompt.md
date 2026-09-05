Rangée de choix. Toujours en `display:flex; gap:var(--gap-chips); flex-wrap:wrap`.

```jsx
{['Nage complète','Bras','Jambes','Éducatif'].map(v => (
  <Chip key={v} selected={variant === v} onClick={() => setVariant(v)}>{v}</Chip>
))}
```

Précéder la rangée d'une étiquette `--label-xs` en majuscules (« Type de variant »).
