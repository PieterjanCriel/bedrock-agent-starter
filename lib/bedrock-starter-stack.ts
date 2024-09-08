import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import {
  Agent,
  AgentActionGroup,
  BedrockFoundationModel,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import * as cdk from "aws-cdk-lib";
import {
  Role,
  ServicePrincipal,
  ManagedPolicy,
  Effect,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

type AgentStackProps = cdk.StackProps;

export class BedrockStarterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AgentStackProps) {
    super(scope, id, props);

    // Create an IAM Role for the Lambda function, allowing it to interact with AWS services
    const lambdaRole = new Role(this, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    // Create a Lambda function that will be available to the Bedrock Agent
    const actionGroupLambda = new PythonFunction(this, "dbLambda", {
      handler: "lambda_handler",
      entry: "lambda/actiongroup",
      index: "main.py",
      runtime: Runtime.PYTHON_3_11,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(10),
      environment: {},
    });

    // Create a new Bedrock Agent construct
    const agent = new Agent(this, "Agent", {
      // Specify the foundational model to use for the agent (no Claude Sonnet 3.5 yet, sad)
      foundationModel: BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0,

      // System prompt
      instruction: `
          Put your instruction here.
      `,
      enableUserInput: false,
      shouldPrepareAgent: true,
    });

    const llmInvokeBedrockPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["bedrock:InvokeModel"],
      resources: ["*"], // @todo restrict to specific model
    });

    agent.role.addToPolicy(llmInvokeBedrockPolicyStatement);

    const actionGroup = new AgentActionGroup(this, "MyActionGroup", {
      actionGroupName: "action-group",
      description: "Action group",
      actionGroupExecutor: {
        lambda: actionGroupLambda, // Specify that this action group will execute via the previously defined Lambda function
      },
      actionGroupState: "ENABLED",
      functionSchema: {
        functions: [
          // Define individual functions within the action group.
          {
            description: "description of doing some action", // Description of the function.
            name: "do-some-action", // Name of the function.
            parameters: {
              // Define parameters required for the function.
              first_name: {
                description: "first name of the user",
                required: true, // This parameter is required.
                type: "string", // Specify the data type.
              },
              last_name: {
                description: "last name of the user",
                required: false, // This parameter is optional.
                type: "string",
              },
            },
          },
        ],
      },
    });

    // Add the action group to the agent.
    agent.addActionGroup(actionGroup);
  }
}
