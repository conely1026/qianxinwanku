export const WEB_RELEASE_SEEN_STORAGE_KEY = 'qianxinwanku:release:last-seen'
export const DESKTOP_RELEASE_SEEN_STORAGE_KEY = 'qianxinwanku:release:desktop:last-seen'
// Preserve the existing Web key export so deployed browsers keep their acknowledgement marker.
export const RELEASE_SEEN_STORAGE_KEY = WEB_RELEASE_SEEN_STORAGE_KEY

export const RELEASE_CHANNELS = Object.freeze({
  ALL: 'all',
  WEB: 'web',
  DESKTOP: 'desktop',
})

// Keep releases in chronological order so missed announcements can be replayed together.
export const RELEASE_HISTORY = [
  {
    id: '2026-08-26-01',
    label: '2026.08.26 · 01',
    // This announcement includes a mobile layout fix and predates the Desktop app.
    channel: RELEASE_CHANNELS.WEB,
    highlights: [
      {
        title: '支持跨日下班',
        description: '下班时间可以选择 +1天，凌晨下班也能正确计算收入和倒计时。',
      },
      {
        title: '换算预设可以编辑',
        description: '名称和价格都能修改，所有项目也可以在确认后删除。',
      },
      {
        title: '移动端体验修正',
        description: '窄屏设置和确认弹窗不再被挤压或遮挡。',
      },
    ],
  },
  {
    id: '2026-08-26-02',
    label: '2026.08.26 · 02',
    // Shift-based leave reset is shared business behavior used by both shells.
    channel: RELEASE_CHANNELS.ALL,
    highlights: [
      {
        title: '离席按班次重置',
        description: '统计不会在凌晨 0 点清零，而是在下一次上班时间到达时自动重置。',
      },
    ],
  },
  {
    id: '2026-08-26-03',
    label: '2026.08.26 · DESKTOP 01',
    channel: RELEASE_CHANNELS.DESKTOP,
    highlights: [
      {
        title: 'Windows 桌面挂件',
        description: '新增透明无边框挂件、窗口置顶、位置锁定、托盘恢复和本机数据保护。',
      },
      {
        title: '小猫上班皮肤',
        description: '工作、离席、午休、下班和休息日会显示对应的小猫状态美术。',
      },
      {
        title: '网页与桌面数据分开',
        description: '升级不会主动清空本地数据；网页数据可通过备份文件迁移到桌面版。',
      },
    ],
  },
]

export const CURRENT_RELEASE = RELEASE_HISTORY.at(-1)

export function getReleasesForChannel(releases, channel) {
  if (!channel) return releases
  return releases.filter((release) => (
    release.channel === RELEASE_CHANNELS.ALL || release.channel === channel
  ))
}

export function getLatestRelease({ releases = RELEASE_HISTORY, channel } = {}) {
  return getReleasesForChannel(releases, channel).at(-1) ?? null
}

export function getUnseenReleases(
  lastSeenReleaseId,
  { releases = RELEASE_HISTORY, includeAllWhenUnseen = false, channel } = {},
) {
  const eligibleReleases = getReleasesForChannel(releases, channel)
  if (!eligibleReleases.length) return []

  if (!lastSeenReleaseId) {
    return includeAllWhenUnseen ? eligibleReleases : eligibleReleases.slice(-1)
  }

  const lastSeenIndex = eligibleReleases.findIndex((release) => release.id === lastSeenReleaseId)
  return lastSeenIndex === -1
    ? eligibleReleases.slice(-1)
    : eligibleReleases.slice(lastSeenIndex + 1)
}

export function shouldShowReleaseNotes(lastSeenReleaseId, options) {
  return getUnseenReleases(lastSeenReleaseId, options).length > 0
}
