import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  SubnetType,
  SecurityGroup,
  InstanceType,
  InstanceClass,
  InstanceSize,
  AmazonLinuxImage,
  Peer,
  Port,
  Instance,
} from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationLoadBalancer,
  ApplicationTargetGroup,
  ApplicationProtocol,
  ListenerAction,
  TargetType,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';

import { InstanceTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

export class CloudFormationToCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'EngineeringVpc', {
      cidr: '10.0.0.0/18',
      maxAzs: 2,
      subnetConfiguration: [
        {
          subnetType: SubnetType.PUBLIC,
          name: 'PublicSubnet',
          cidrMask:24,
        },
      ],
    });

    const sg = new SecurityGroup(this, 'WebserversSG', {
      vpc,
      allowAllOutbound: true,
      description: 'Allow HTTP and SSH',
    });
    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    sg.addIngressRule(Peer.ipv4('71.193.75.29/32'), Port.tcp(22), 'Allow SSH');

    const ami = new AmazonLinuxImage();

    const web1 = new Instance(this, 'web1', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO), 
      machineImage: ami, 
      securityGroup: sg,
      keyName: 'my-key-pair',
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    const web2 = new Instance(this, 'web2', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO), 
      machineImage: ami, 
      securityGroup: sg,
      keyName: 'my-key-pair',
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    const alb = new ApplicationLoadBalancer(this, 'EngineerLB', {
      vpc,
      internetFacing: true,
    });

    const targetGroup = new ApplicationTargetGroup(this, 'EngineeringWebservers', {
      vpc,
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.INSTANCE, 
      targets: [
        new InstanceTarget(web1),
        new InstanceTarget(web2),
      ],
    });

    alb.addListener('Listener', {
      port: 80,
      defaultAction: ListenerAction.forward([targetGroup]),
    });

    new cdk.CfnOutput(this, 'WebUrl', {
      value: alb.loadBalancerDnsName,
      description: 'The URL of the load balancer',
    });
  }
}
