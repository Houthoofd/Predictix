const decorateConsole = (fn) => {
  return (...args) => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    fn(`[${time}]`, ...args);
  };
};

console.log = decorateConsole(console.log);
console.warn = decorateConsole(console.warn);
console.error = decorateConsole(console.error);
