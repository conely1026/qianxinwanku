export const RELEASE_SEEN_STORAGE_KEY = 'qianxinwanku:release:last-seen'

// Bump this id only when a release should show a new announcement.
export const CURRENT_RELEASE = {
  id: '2026-08-26-01',
  label: '2026.08.26',
  title: '这次更新了这些',
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
}

export function shouldShowReleaseNotes(lastSeenReleaseId, releaseId = CURRENT_RELEASE.id) {
  return lastSeenReleaseId !== releaseId
}
