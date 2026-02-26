

## Painel de Debug Visual no App

### Problema
O Safari Web Inspector não consegue inspecionar o app Capacitor no iPhone (mostra apenas "Conecte via Network"), impossibilitando ver os logs JavaScript durante a integração com o HealthKit.

### Solução
Criar um componente de debug visual embutido no app que captura todos os `console.log`, `console.error` e `console.warn` e os exibe em um painel overlay na tela do iPhone. Assim não é necessário o Safari Web Inspector.

### Arquivos a criar/modificar

**1. Criar `src/components/DebugConsole.tsx`**
- Componente overlay flutuante que aparece sobre qualquer tela
- Botão pequeno no canto inferior esquerdo (ex: "🐛") para abrir/fechar
- Área com scroll mostrando os logs capturados em tempo real
- Cada log com timestamp, nível (info/warn/error) e mensagem
- Botão "Limpar" para resetar os logs
- Botão "Copiar tudo" para copiar os logs para o clipboard
- Sobrescreve `console.log`, `console.warn`, `console.error` para capturar tudo
- Só aparece em ambiente de desenvolvimento ou quando ativado manualmente

**2. Modificar `src/App.tsx`**
- Importar e renderizar `<DebugConsole />` como último filho do layout principal
- Visível apenas em plataforma nativa (Capacitor) ou via flag

### Detalhes técnicos

O componente irá:
1. No `useEffect` de montagem, interceptar `console.log`, `console.warn`, `console.error` salvando os originais e substituindo por wrappers que chamam o original + armazenam a mensagem em state
2. Manter um array de até 500 mensagens no state com `{ timestamp, level, message }`
3. Usar `JSON.stringify` para serializar objetos nos argumentos do console
4. Auto-scroll para o final quando novos logs chegam
5. Restaurar os console originais no `useEffect` cleanup

Estilo visual:
- Fundo escuro semi-transparente com texto monoespaçado
- Errors em vermelho, warns em amarelo, logs em verde
- Overlay com z-index alto para ficar sobre todo o app
- Altura ~50% da tela, com resize possível

### Resultado esperado
Ao abrir o app no iPhone e tocar no botão de debug, os logs JavaScript aparecem diretamente na tela. Ao tentar conectar o Apple Health, todos os logs `[healthkit]` ficam visíveis no painel, permitindo diagnosticar o problema sem depender do Safari Web Inspector.

