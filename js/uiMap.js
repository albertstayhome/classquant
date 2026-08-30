/**
 * ClassQuant Hub - Standardized UI Map & Element Registry (v1.7.0)
 * 
 * Provides a deterministic, semantic registry of all user interface components across views.
 * Allows any AI agent, automated test runner, or tour engine to programmatically resolve
 * exact DOM selectors, trigger standard actions, and verify view states.
 */

window.AppUIMap = {
  // --- Navigation Tabs (底部/頂部全域導覽列) ---
  TABS: {
    BAR: 'nav.glass-card',
    MATRIX: 'button[data-tab="matrix"]',
    ROSTER: 'button[data-tab="roster"]',
    RETRO: 'button[data-tab="retro"]',
    DASHBOARD: 'button[data-tab="dashboard"]',
    EVENTS: 'button[data-tab="events"]',
    TIMETABLE: 'button[data-tab="timetable"]',
    SETTINGS: 'button[data-tab="settings"]'
  },

  // --- Header Controls (頂部全域功能橫幅) ---
  HEADER: {
    CONTAINER: 'header.glass-card',
    CLASS_SELECT: '#global-class-select',
    VERSION_BADGE: '#header-version-badge',
    SOUND_TOGGLE_BTN: '#sound-toggle-btn',
    THEME_TOGGLE_BTN: '#theme-toggle-btn',
    COLLAPSE_HEADER_BTN: 'header button[title="收合頂部橫幅"]',
    PWA_INSTALL_BTN: '#pwa-install-btn',
    SCHEDULE_STATUS: '#header-schedule-status',
    LIVE_CLOCK: '#header-live-clock'
  },

  // --- Classroom Matrix View (課堂點記板 - 座位與快速標籤) ---
  MATRIX: {
    CONTAINER: '#classroom-matrix-view',
    CLASS_HEADER_TITLE: '#classroom-matrix-view h2',
    CLASS_OVERVIEW_STATS: '#classroom-matrix-view .text-slate-600',
    SEAT_GRID: '#classroom-matrix-view .grid',
    SEAT_CARD: (seatNo) => `#seat-card-${seatNo}`,
    SELECTION_BADGE: '#selection-status-badge',
    SELECTED_COUNT: '#selected-count',
    CLEAR_SELECTION_BTN: '#clear-sel-btn',
    QUICK_SELECT_BAR_TOGGLE_BTN: '#matrix-quick-select-toggle-btn',
    SELECT_ALL_BTN: '#matrix-select-all-btn',
    RETRO_TOP_BTN: '#retro-log-top-btn',
    RANDOM_PICKER_BTN: '#random-picker-btn',
    CONFLICT_EVENT_BTN: '#conflict-btn',
    TAG_PAGER_SCROLL_BOX: '#tag-pager-scroll-box',
    FIRST_QUICK_TAG_BTN: '#first-quick-tag-btn',
    QUICK_TAG_BTN: (tagId) => `#quick-tag-btn-${tagId}`,
    CUSTOM_TAG_OPEN_BTN: '#custom-tag-open-btn',
    TAG_PAGER_PREV_BTN: '#tag-pager-prev-btn',
    TAG_PAGER_NEXT_BTN: '#tag-pager-next-btn',
    TAG_PAGE_DOTS: '#tag-page-dots'
  },

  // --- Roster Manager View (班級與學生名單管理中心) ---
  ROSTER: {
    CONTAINER: '#roster-manager-view',
    CLASS_SELECT: '#roster-class-select',
    BATCH_PASTE_BTN: '#roster-paste-btn',
    ADD_CLASS_BTN: '#roster-add-class-btn',
    EDIT_CLASS_BTN: '#roster-edit-class-btn',
    DELETE_CLASS_BTN: '#roster-delete-class-btn',
    ADD_STUDENT_BTN: '#roster-add-student-btn',
    STUDENT_CARD: (seatNo) => `#roster-student-card-${seatNo}`,
    STUDENT_NAME_INPUT: (seatNo) => `#roster-student-name-input-${seatNo}`,
    DELETE_STUDENT_BTN: (seatNo) => `#roster-student-delete-${seatNo}`
  },

  // --- Post-Class Retro-Log View (課堂事後快速補記專區) ---
  RETRO: {
    CONTAINER: '#retro-log-view',
    CLASS_SELECT: '#retro-class-select',
    DATE_INPUT: '#retro-date-input',
    PERIOD_SELECT: '#retro-period-select',
    ODD_BTN: '#retro-odd-btn',
    EVEN_BTN: '#retro-even-btn',
    ALL_BTN: '#retro-all-btn',
    CLEAR_SEAT_BTN: '#retro-clear-btn',
    STUDENT_SELECT_CARD: (seatNo) => `#retro-seat-card-${seatNo}`,
    QUICK_NOTE_BTN: (idx) => `#retro-quick-comment-${idx}`,
    NOTE_INPUT: '#retro-note-input',
    TAG_SELECT: '#retro-tag-select',
    SUBMIT_BTN: '#retro-submit-btn'
  },

  // --- Statistics Dashboard View (統計戰情室) ---
  DASHBOARD: {
    CONTAINER: '#dashboard-view',
    CLASS_SELECT: '#dashboard-class-select',
    DATE_RANGE_SELECT: '#dashboard-date-range',
    QUADRANT_CHART_CARD: '#quadrant-chart-card',
    TREND_CHART_CARD: '#trend-chart-card',
    SUMMARY_CARDS: '#dashboard-summary-cards',
    EXPORT_EXCEL_BTN: '#dashboard-export-excel-btn'
  },

  // --- Global Modals (全域視窗與對話盒) ---
  MODAL: {
    OVERLAY: '#global-modal',
    CONTENT: '#global-modal-content',
    CLOSE_BTN: '#global-modal-close-btn',
    
    // Batch Paste Modal
    BATCH_PASTE_TEXTAREA: '#batch-roster-textarea',
    BATCH_PASTE_SUBMIT_BTN: '#batch-roster-submit-btn',
    BATCH_PASTE_CANCEL_BTN: '#batch-roster-cancel-btn',

    // Tag Manager Modal
    TAG_MANAGER_FORM: '#tag-manager-form',
    TAG_NAME_INPUT: '#new-tag-name',
    TAG_CATEGORY_SELECT: '#new-tag-category',
    TAG_DELTA_INPUT: '#new-tag-delta',
    TAG_SUBMIT_BTN: '#new-tag-submit-btn',
    RESTORE_DEFAULT_TAGS_BTN: '#restore-default-tags-btn',

    // Bulletin Modal (公佈欄與更新日誌)
    BULLETIN_CONTAINER: '#bulletin-modal-container',
    USER_GUIDE_LINK: '#user-guide-link'
  },

  // --- Toast Notification ---
  TOAST: '#global-toast'
};
