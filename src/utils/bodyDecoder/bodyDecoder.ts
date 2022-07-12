/* eslint-disable no-restricted-syntax */
import AutoLinker from 'autolinker'
import DOMPurify from 'dompurify'
import {
  IAttachment,
  IEmailAttachmentType,
} from '../../components/EmailDetail/Attachment/EmailAttachmentTypes'
import { decodeBase64 } from '../decodeBase64'
import fetchAttachment from '../fetchAttachment'
import removeScripts from '../removeScripts'
import removeTrackers from '../removeTrackers'
import * as global from '../../constants/globalConstants'
import {
  IEmailListThreadItem,
  IEmailMessagePayload,
} from '../../store/storeTypes/emailListTypes'

let decodedString: string | undefined = ''
let localMessageId: string | null = ''
let localDecodeImage: boolean | undefined = false
let decodedResult: any[] = []

/**
 * @function enhancePlainText
 * @param localString a plain text string that needs to be enhanced.
 * @returns it will return a string that has been line "breaked" and has activated links.
 */

const enhancePlainText = (localString: string) => {
  const enhancedText = () => {
    const lineBreakRegex = /(?:\r\n|\r|\n)/g
    return (
      AutoLinker.link(localString, { email: false }).replace(
        lineBreakRegex,
        '<br>'
      ) ?? ''
    )
  }
  return enhancedText()
}

/**
 * @function inlineImageDecoder
 * @property {object} params - parameter object that contains the relevant id of the message and the object with attachment data.
 * @returns returns a response based on an API call to fetch the attachment base64 data, or null if the response is not available.
 */

const inlineImageDecoder = async ({
  attachmentData,
  messageId,
}: {
  messageId: string
  attachmentData: IEmailAttachmentType
}) => {
  const response = await fetchAttachment({ attachmentData, messageId })
  if (response) {
    return response
  }
  return null
}

// This function recursively loops in the emailbody to find a body to decode. If initially priotizes the last object in a parts array.
/**
 * @function loopThroughBodyParts
 * @param {object} params - parameter object that contains an inputObject and an abort signal. The inputObject can be of type IEmailMessage or IEmailMessagePayload
 * @returns
 */
export const loopThroughBodyParts = async ({
  inputObject,
  signal,
}: {
  inputObject: IEmailMessagePayload
  signal: AbortSignal
}): Promise<any> => {
  if (signal.aborted) {
    throw new Error(signal.reason)
  }
  console.log(inputObject)
  const loopingFunction = async ({
    loopObject,
  }: {
    loopObject: IEmailMessagePayload
  }) => {
    try {
      const objectKeys = Object.keys(loopObject)
      for (const objectKey of objectKeys) {
        if (objectKey === 'body') {
          if (loopObject.body.size > 0) {
            if (
              loopObject.body?.attachmentId &&
              loopObject.body?.data &&
              localDecodeImage &&
              localMessageId
            ) {
              // If it is an image, use the image decoder
              const imageObjectPromise = inlineImageDecoder({
                attachmentData: loopObject,
                messageId: localMessageId,
              })
              decodedResult.push(imageObjectPromise)
            }
            decodedString = decodeBase64(`${loopObject.body.data}`)
            if (loopObject.mimeType !== 'text/plain' && decodedString) {
              decodedResult.push(decodedString)
            } else if (loopObject.mimeType === 'text/plain' && decodedString) {
              const localString = decodedString
              decodedResult.push(enhancePlainText(localString))
            }
          }
        }
        if (objectKey === 'parts') {
          if (
            loopObject.body.size === 0 ||
            !Object.prototype.hasOwnProperty.call(loopObject, 'body')
          ) {
            // If the object has no parts of its own, loop through all of them to decode
            loopObject.parts.forEach((part) => {
              loopingFunction({
                loopObject: part,
              })
            })
          }
        }
      }
      if (!signal.aborted) {
        const result = await Promise.all(decodedResult)
        return result
      }
      return null
    } catch (err) {
      decodedResult = []
      const typedError: any = err
      return typedError
    }
  }
  return loopingFunction({ loopObject: inputObject })
}

/**
 * @function prioritizeHTMLbodyObject
 * Prioritise the string object that has the HTML tag in it. Remove the others.
 * First understand how many string objects there are, if more than 1, than filter out the lesser valued ones
 * @param response - takes in the response, as an array of objects and strings
 * @returns if the param object only contains one string, return that. If not, it attempts to find the most html rich string.
 */

// TODO: Refactor code to intake the orderedObject, and loop only over the string array
const prioritizeHTMLbodyObject = (response: Array<string | IAttachment>) => {
  const indexOfStringObjects: number[] = []
  const indexOfRemovalObjects: number[] = []
  for (let i = 0; i < response.length; i += 1) {
    // If the response is a string but doesn't have html, mark it for removal.
    // We need to run this first to understand how many string objects the response has.

    const r = response[i]
    if (typeof r === 'string' && !r.includes('</html>')) {
      indexOfRemovalObjects.push(i)
    }
    if (typeof response[i] === 'string') {
      indexOfStringObjects.push(i)
    }
  }
  // If there is only 1 string item in the response, use that.
  if (indexOfStringObjects.length === 1 && indexOfRemovalObjects.length === 1) {
    return response
  }
  if (indexOfStringObjects.length > indexOfRemovalObjects.length) {
    for (let i = indexOfRemovalObjects.length - 1; i >= 0; i -= 1) {
      response.splice(indexOfRemovalObjects[i], 1)
    }
    return response
  }
  // If none items are found, guess which item is the most valuable.
  const estimatedMostValuableItem: string[] = []
  for (const item in response) {
    if (typeof item === 'string' && item.startsWith('<')) {
      estimatedMostValuableItem.push(item)
    }
  }
  return estimatedMostValuableItem
}

/**
 * @function orderArrayPerType
 * @param objectWithPriotizedHTML - an array that can contain objects and only one string (via prioritizeHTMLbodyObject function)
 * @returns {object} that contains the first matched string as the emailHTML, and all the objects in the array as emailFileHTML
 */

export const orderArrayPerType = (
  objectWithPriotizedHTML: Array<string | IAttachment>
) => {
  const firstStringOnly: string[] = []
  const objectOnly: IAttachment[] = []
  for (const item of objectWithPriotizedHTML) {
    if (typeof item === 'string') {
      firstStringOnly.push(item)
    }
    if (typeof item === 'object') {
      objectOnly.push(item)
    }
  }
  return { emailHTML: [firstStringOnly[0]], emailFileHTML: objectOnly }
}

/**
 * @function placeInlineImage
 * @param orderedObject - check the string body for CID (files) if there is a match, replace the img tag with the fetched file.
 * @returns {Object} - an object with emailHTML and emailFileHTML
 */

// Check the string body for CID (files) if there is a match, replace the img tag with the fetched file
export const placeInlineImage = (orderedObject: {
  emailHTML: string
  emailFileHTML: IAttachment[]
}): { emailHTML: string; emailFileHTML: IAttachment[] } => {
  if (orderedObject.emailFileHTML.length > 0) {
    const localCopyOrderedObject = orderedObject
    let outputString = ''
    const remainingObjectArray: IAttachment[] = []
    for (const emailFileHTML of orderedObject.emailFileHTML) {
      const matchString = `cid:${emailFileHTML.contentID}`

      // If the contentId of the object is not found in the string (emailbody) it should not be removed.
      if (orderedObject.emailHTML?.search(matchString) === -1) {
        remainingObjectArray.push(emailFileHTML)
      }
      // Of the first loop, instantiate the outputString. On next runs use that string.
      if (outputString !== undefined && outputString.length === 0) {
        outputString = orderedObject.emailHTML?.replace(
          matchString,
          `data:${emailFileHTML.mimeType};base64,${emailFileHTML.decodedB64}`
        )
      } else {
        outputString = outputString.replace(
          matchString,
          `data:${emailFileHTML.mimeType};base64,${emailFileHTML.decodedB64}`
        )
      }
    }
    // Only set the output string, if the code above has ran for it.
    if (outputString && outputString.length > 0) {
      localCopyOrderedObject.emailHTML = outputString
    }
    // If there are attachment objects left, filter out the ones that cannot be displayed in html.
    localCopyOrderedObject.emailFileHTML = remainingObjectArray.filter(
      (item) => item.mimeType !== global.MIME_TYPE_NO_INLINE
    )
    return localCopyOrderedObject
  }
  return orderedObject
}

/**
 * @function bodyDecoder
 * @property {object} - object can contain messageId and should contain inputObject, decodeImage, and signals
 * @param messageId - takes in messageId to understand which message is being decoded
 * @param inputObject -  an object from the Gmail API, that is the message object
 * @param decodeImage - a boolean, to see if the the input object should be decoded with the decodeImage function
 * @param signal - an abort signal object to cancel the decoding process, if needed
 * @returns a promise that resolves with the decoded email object, sorted on emailHTML and emailFileHTML, and showing which trackers have been removed from the email.
 */

const bodyDecoder = async ({
  messageId,
  inputObject,
  decodeImage,
  signal,
}: {
  messageId?: string
  inputObject: any
  decodeImage: boolean
  signal: AbortSignal
}): Promise<{
  emailHTML: string
  emailFileHTML: any[]
  removedTrackers: Attr[] | []
}> => {
  try {
    if (decodeImage) {
      localDecodeImage = decodeImage
    }
    if (messageId) {
      localMessageId = messageId
    }
    let response = await loopThroughBodyParts({
      inputObject,
      signal,
    })
    // Reset the local variable for the next decode
    decodedResult = []

    response = prioritizeHTMLbodyObject(response)
    // orderArrayPerType changes the response object into an object that can hold two objects: emailHTML[], emailFileHTML[]
    response = orderArrayPerType(response)
    response = placeInlineImage(response)
    response = removeTrackers(response)
    response = removeScripts(response)
    response = {
      ...response,
      emailHTML: DOMPurify.sanitize(response.emailHTML, {
        USE_PROFILES: { html: true },
      }),
    }
    return response
  } catch (err) {
    const typedError: any = err
    return typedError
  }
}

export default bodyDecoder
