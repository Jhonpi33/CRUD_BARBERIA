import { runHelpAssistant } from '../services/assistantHelp.js'
import { AgentError } from '../services/agent/gemini.js'

export async function helpChat(req, res, next) {
  try {
    const { message, history = [] } = req.body
    const result = await runHelpAssistant({ message, history })
    res.json(result)
  } catch (err) {
    if (err instanceof AgentError) {
      return res.status(err.status).json({ message: err.message, code: err.code })
    }
    next(err)
  }
}
