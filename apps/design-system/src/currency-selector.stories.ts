import {CurrencySelector} from '@bam-otf/react'
import type {Meta, StoryObj} from '@storybook/react'

const meta = {
  title: 'React/CurrencySelector',
  component: CurrencySelector,
  args: {
    selectedCurrency: 'USD',
    onCurrencyChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newCurrency = event.target.value
      console.log('Currency:', newCurrency)
    },
  },
  parameters: {
    backgrounds: {
      values: [
        {name: 'white', value: '#fff'},
        {name: 'black', value: '#000'},
        {name: 'grey', value: '#ccc'},
      ],
    },
  },
} satisfies Meta<typeof CurrencySelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
