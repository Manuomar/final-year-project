// account - manuomar0126@gmail.com

import { useParams } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
const Room = () => {
    const {name} :any= useParams();

    const myMeeting = async (element:any) => {
        // const appID = 212110772;
        const appID = 45051531;
        // const serverSecret = "ff78172e087e6d04d9d6a28d2760ed01"; // Replace with your actual server secret
        const serverSecret = "8db395223a5c68be2807e70235671b30"; // Replace with your actual server secret
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            name,
            Date.now().toString(),
            "User" + Math.floor(Math.random() * 1000)
        );
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zp.joinRoom({
            container: element,
            scenario: {
                mode: ZegoUIKitPrebuilt.VideoConference,
            },
        });
    }
  return (
    <div>
     <div className='mt-2 w-screen h-[90vh]' ref={myMeeting}/>
    </div>
  )
}

export default Room
