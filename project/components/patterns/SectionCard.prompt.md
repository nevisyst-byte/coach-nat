Unique niveau de carte : ne jamais imbriquer une SectionCard dans une autre.

```jsx
<SectionCard title="Charge par coach" meta="Heures / semaine">
  {coachs.map(c => <MeterBar key={c.nom} {...c} />)}
</SectionCard>
```

Grille type : `repeat(auto-fit, minmax(340px, 1fr))` avec `gap:var(--gap-grid)`.
