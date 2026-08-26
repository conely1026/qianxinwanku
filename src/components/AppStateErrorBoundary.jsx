import { Component } from 'react'

export class AppStateErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const isFutureVersion = error?.code === 'APP_STATE_VERSION_FUTURE'
    return (
      <main className="state-error-screen" role="alert">
        <p className="micro-label">LOCAL DATA PROTECTED</p>
        <h1>{isFutureVersion ? '这份数据来自更新版本。' : '本机数据暂时无法读取。'}</h1>
        <p>
          {isFutureVersion
            ? '为避免旧版本覆盖数据，当前页面没有加载或写回任何默认值。请刷新页面使用最新版。'
            : '当前页面没有写入默认值。请刷新后重试。'}
        </p>
        <button className="primary-button" type="button" onClick={this.props.onReload}>刷新页面</button>
      </main>
    )
  }
}
