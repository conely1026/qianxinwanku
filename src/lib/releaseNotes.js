export const RELEASE_SEEN_STORAGE_KEY = 'qianxinwanku:release:last-seen'

// Keep releases in chronological order so missed announcements can be replayed together.
export const RELEASE_HISTORY = [
  {
    id: '2026-08-26-01',
    label: '2026.08.26 · 01',
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
    highlights: [
      {
        title: '带薪离席按班次重置',
        description: '统计不会在凌晨 0 点清零，而是在下一次上班时间到达时自动重置。',
      },
    ],
  },
]

export const CURRENT_RELEASE = RELEASE_HISTORY.at(-1)

export function getUnseenReleases(
  lastSeenReleaseId,
  { releases = RELEASE_HISTORY, includeAllWhenUnseen = false } = {},
) {
  if (!releases.length) return []

  if (!lastSeenReleaseId) {
    return includeAllWhenUnseen ? releases : releases.slice(-1)
  }

  const lastSeenIndex = releases.findIndex((release) => release.id === lastSeenReleaseId)
  return lastSeenIndex === -1 ? releases.slice(-1) : releases.slice(lastSeenIndex + 1)
}

export function shouldShowReleaseNotes(lastSeenReleaseId, options) {
  return getUnseenReleases(lastSeenReleaseId, options).length > 0
}
