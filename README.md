# spy-radar-zones

MVP Expo (React Native + TypeScript) de zonas de risco por GPS com visual estilo espiao.

## Comandos

```bash
npm install
npx expo start
```

## Observacoes

- O app solicita permissao de localizacao em primeiro plano ao abrir.
- Para alertas locais em Android 13+, permita notificacoes quando solicitado.
- O armazenamento das zonas e local, usando `AsyncStorage` com a chave `SPY_ZONES_V1`.
- O fluxo foi pensado para funcionar no Expo Go, com foco de teste em Android.
