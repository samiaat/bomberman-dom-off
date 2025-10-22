export const createRouter = (store) => {
  const getScreenFromHash = () => {
    const hash = window.location.hash || '#/nickname';
    // Supprime le # et découpe par "/"
    const segments = hash.slice(2).split('/'); // '#/' => ''
    const screen = segments[0] || 'nickname';
    const params = segments.slice(1); // tout ce qui vient après le screen
    return { screen, params };
  };

  const handleHashChange = () => {
    const { screen, params } = getScreenFromHash();
    store.dispatch({
      type: 'SET_SCREEN',
      payload: { screen, params },
    });
  };

  window.addEventListener('hashchange', handleHashChange);

  // Initial route handling
  handleHashChange();

  // Function to navigate
  const navigate = (path) => {
    window.location.hash = path;
  };

  return { navigate };
};
