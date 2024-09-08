import json
import logging
from pprint import pformat

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def convert_params_to_dict(params_list: list):
    """
    Convert a list of parameters to a dictionary
    :param params_list: list containing params, e.g. [{"name": "report_id", "value": "42"}]
    :return: dictionary containing params, e.g. {"report_id": "42"}
    """

    params_dict = {
        param.get("name"): param.get("value")
        for param in params_list
        if param.get("name") is not None
    }

    return params_dict

def lambda_handler(event, context):

    # Get the agent, actionGroup and function from the event
    agent = event["agent"]
    actionGroup = event["actionGroup"]
    function = event["function"]
    logger.info(f"Invoked by agent: {agent}")
    logger.info(f"Received event: {pformat(event)}")

    body = None

    match actionGroup:
        case "action-group":
            match function:
                case "do-some-action":
                    params_list = event.get("parameters", [])
                    params_dict = convert_params_to_dict(params_list)
                    
                    first_name = params_dict.get("first_name")

                    body =  f"Hello {first_name}!"

                case _:
                    return {"error": "Unknown function"}
        case _:
            return {"error": "Unknown actionGroup"}

    if body is None:
        raise Exception("No body was generated")
    
    # Create the action response
    response = {
        "actionGroup": actionGroup,
        "function": function,
        "functionResponse": {"responseBody": {"TEXT": {"body": body}}},
    }
    
    function_response = {'response': response, 'messageVersion': event['messageVersion']}
    
    logger.info(f"sending response: {pformat(function_response)}")

    return function_response
