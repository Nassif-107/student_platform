export const EVENT_TYPES = {
  HACKATHON: 'хакатон',
  CONFERENCE: 'конференция',
  SPORT: 'спорт',
  CONCERT: 'концерт',
  MASTERCLASS: 'мастер-класс',
  OTHER: 'другое',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]
