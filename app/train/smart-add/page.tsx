'use client'

import { SmartTrainer } from '@/components/SmartTrainer'
import { ADD_LADDER, ADD_SKILL_LABEL, additionOptions, genAddition, type AddSkill } from '@/lib/skills'

export default function SmartAddTrainer() {
  return (
    <SmartTrainer config={{
      titleKey: 'train_smart_add',
      ladder: ADD_LADDER,
      skillLabel: ADD_SKILL_LABEL,
      gen: s => genAddition(s as AddSkill),
      options: additionOptions,
      op: '+',
      helpSkill: 'add_2d_carry',
      helpTag: 'forgot_carry',
      helpHintKey: 'sm_help_carry',
    }} />
  )
}
