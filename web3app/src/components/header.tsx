//src/components/header.tsx
import NextLink from "next/link";
import {
  Flex,
  Spacer,
  Heading,
  LinkBox,
  LinkOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import ConnectButton from "./ConnectButton";
import AccountModal from "./AccountModal";

const siteTitle = "FirstDAPP";
export default function Header() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  function handleOpen() {
    console.log("handle open");
    onOpen();
    console.log(isOpen);
  }

  return (
    <Flex
      as="header"
      bg="gray.800"
      p={4}
      alignItems="center"
      justifyContent="center"
    >
      <LinkBox>
        <NextLink href={"/"} passHref>
          <LinkOverlay>
            <Heading size="md">{siteTitle}</Heading>
          </LinkOverlay>
        </NextLink>
      </LinkBox>
      <Spacer />
      <ConnectButton handleOpenModal={handleOpen}/>
      <AccountModal isOpen={isOpen} onClose={onClose} />
    </Flex>
  );
}
