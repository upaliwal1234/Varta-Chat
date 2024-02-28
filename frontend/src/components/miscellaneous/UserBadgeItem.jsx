/* eslint-disable react/prop-types */
import { CloseIcon } from "@chakra-ui/icons"
import { Box } from "@chakra-ui/react"

function UserBadgeItem({ user, handleFunction }) {

    return (
        <div>
            <Box
                px={2}
                py={1}
                borderRadius='md'
                m={1}
                mb={2}
                variant='solid'
                fontSize={12}
                fontWeight='bold'
                backgroundColor='purple'
                color='white'
                cursor='pointer'
                onClick={handleFunction}
            >
                {user.name}
                <CloseIcon pl={1} />
            </Box>
        </div>
    )
}

export default UserBadgeItem