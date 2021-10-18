(function() {
  const App = function Component() {
    return <h1>React APP.</h1>
  }
  const container = document.getElementById('app')
  ReactDOM.render(<App />, container, () => console.log('render done.'))
}())
