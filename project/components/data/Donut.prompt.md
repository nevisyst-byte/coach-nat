Camembert + légende chiffrée. Trois côte à côte maximum, jamais plus de 6 parts chacun.

```jsx
<Donut
  centerValue="15,8 km" centerLabel="nagés"
  slices={[
    { label: 'Crawl', value: 7200, color: 'var(--blue)', meta: '7,2 km' },
    { label: '4 nages', value: 3400, color: 'var(--cyan)', meta: '3,4 km' }
  ]}
/>
```

Les pourcentages sont calculés par le composant : ne jamais les passer à la main.
