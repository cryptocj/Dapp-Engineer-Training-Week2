// src/components/layout.tsx
import React, { ReactNode } from 'react'
import { Text, Center, Container, useColorModeValue } from '@chakra-ui/react'
import Header from './header'
import { ChainId, DAppProvider, Rinkeby } from '@usedapp/core'

type Props = {
  children: ReactNode
}

const config = {
  readOnlyChainId: ChainId.Rinkeby,
  readOnlyUrls: {
    [Rinkeby.chainId]: 'https://rinkeby.infura.io/v3/978476fdc7a44c23ad093a7552d5161a',
  },
}

export function Layout(props: Props) {
  return (
    <DAppProvider config={config}>
      <Header />
      <Container maxW="container.md" py='8'>
        {props.children}
      </Container>
      <Center as="footer" bg={useColorModeValue('gray.100', 'gray.700')} p={6}>
          <Text fontSize="md">first dapp by W3BCD - 2022</Text>
      </Center>
    </DAppProvider>
  )
}
